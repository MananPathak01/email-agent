# Communication Profile Spec v1.0

**Purpose:** Define the end‑to‑end system that learns a user's real email style from Gmail data, stores it as a reusable "communication profile," and serves it to an email reply generator to produce on‑brand drafts.

## High‑level Flow
Gmail API (read-only) → 2) Email Collection & Thread Expansion → 3) AI Analysis (Groq) → 4) Feature Extraction & Confidence Scoring → 5) Aggregation & Drift Handling → 6) Profile Store (SQL + Vector DB) → 7) Serving Layer (Prompt Builder + API).

## 1) System Goals & Non‑Goals

### Goals
- Learn stable, individualized writing patterns from actual sent/received emails.
- Produce structured, queryable features (the "feature store") with confidence scores.
- Support context‑aware generation: relationship-, topic-, and situation‑specific replies.
- Respect privacy: minimize raw content storage; prefer derived features.

### Non‑Goals (v1)
- Full multi‑language parity (we'll support English + basic detection of variants).
- Real‑time streaming during composition (v1 updates profile in batches).

## 2) Data Ingestion & Thread Expansion

### Source
Gmail API using gmail.readonly scope.

### Selection
- **Primary Inbox:** latest N=20 messages.
- **Sent Mail:** latest N=20 messages.
- For each sent message, pull 2–3 related thread emails (prev/next) for context.

### Normalization
- Strip signatures/footers, quoted previous messages, confidentiality notices.
- Parse headers (From/To/CC/BCC/Date/Message‑ID/In‑Reply‑To/References/Subject).
- Tokenize body (plain text preferred; HTML → text with basic formatting hints).

### Storage (raw, optional & encrypted)
- **Short‑lived cache** (e.g., 7–30 days) for reprocessing/debug.
- **Long‑term:** avoid storing full bodies; store minimal snippets or hashes.

## 3) AI Analysis (Groq) — Multi‑Pass

### Pass A — Classification & Signals (per email)
Tone/formality, relationship guess, structure metrics, emotion markers, etc.

### Pass B — Cross‑Email Consolidation (per contact & per topic)
Compare emails to same contact/domain/topic to refine labels & confidence.

### Pass C — Embeddings
Compute sentence/paragraph‑level style embeddings of sent messages to represent the user's voice; aggregate to per‑user and per‑relationship vectors.

**Outputs:** JSON with features + confidence + extraction provenance (prompt version, model version, email IDs).

## 4) Feature Store (Variables)

Below are the variables the system maintains. For each item we define: **Scope** (per‑user, per‑relationship, per‑topic, per‑thread‑position), **Type**, **How to Extract**, **Aggregation**, and **Example**. All numeric variables carry confidence (0–1) and recency weighting.

### 4.1 Tone & Formality Patterns

#### formality_score
- **Scope:** per‑email → aggregated per‑relationship & per‑topic
- **Type:** 1–10 (1=casual, 10=formal)
- **Extraction:** LLM rubric (lexicon + cues: honorifics, modal verbs, contractions).
- **Aggregation:** EWMA (half‑life 90 days), store mean ± std.
- **Example:** boss=8.2±0.9, colleague=4.1±1.3.

#### tone_distribution
- **Scope:** per‑user & per‑relationship
- **Type:** % {formal, neutral, casual}
- **Extraction:** softmax over model tone logits.
- **Aggregation:** normalized counts with decay.

#### formality_triggers
- **Scope:** per‑user
- **Type:** list of triggers with weights (keywords/subjects/roles/urgency).
- **Extraction:** rules + LLM: detect patterns (e.g., "contract", "invoice", "ASAP", external domains).
- **Aggregation:** count‑based weights.
- **Example:** mentions_deadline → +2 formality; external_vendor → +1.

#### context_formality_map
- **Scope:** per‑relationship type
- **Type:** map {role: avg formality_score}.
- **Extraction:** aggregate of formality_score grouped by inferred/declared role.

#### readability_grade (new)
- **Scope:** per‑user & per‑relationship
- **Type:** Flesch‑Kincaid grade (float)
- **Extraction:** deterministic formula on sentences/words/syllables.
- **Why:** helps generator match complexity level.

#### hedging_level (new)
- **Scope:** per‑relationship
- **Type:** 0–1 frequency of hedges ("might", "perhaps", "I think").
- **Extraction:** lexicon + LLM confirmation.

### 4.2 Greeting & Closing Patterns

#### greeting_styles
- **Scope:** per‑relationship
- **Type:** ranked list of greetings with usage % and capitalization style.
- **Extraction:** detect first non‑quoted line; classify pattern (e.g., "Hi {Name},").
- **Example:** Colleague → ["Hi {First}," 62%, "Hello {First}," 25%, "Hey {First}," 8%].

#### closing_styles
- **Scope:** per‑relationship
- **Type:** ranked list with punctuation (comma/period) and sign‑off spacing.
- **Example:** Client → ["Best," 41%, "Kind regards," 33%, "Thanks," 12%].

#### name_usage_pattern
- **Scope:** per‑relationship
- **Type:** {first_name%, full_name%, honorific%}.
- **Extraction:** compare salutation tokens to contact metadata.

#### signature_block_pattern (new)
- **Scope:** per‑user
- **Type:** components (name/title/phone/links/disclaimer) + delimiter style.
- **Why:** generator should respect or omit auto‑signature duplication.

#### signoff_punctuation_style (new)
- **Scope:** per‑user & per‑relationship
- **Type:** enum {comma, period, none} and newline count before signature.

### 4.3 Communication Personality Traits

#### directness_level
- **Type:** 1–10 (1=diplomatic/indirect, 10=blunt/direct).
- **Signals:** imperative verbs, mitigators, qualifiers.

#### warmth_level
- **Type:** 1–10 (cold → very friendly).
- **Signals:** positive affect, small talk, appreciation.

#### enthusiasm_indicators
- **Type:** rate per 1000 words of exclamations/"great/awesome/love".

#### politeness_markers
- **Type:** rate of "please/thank you/I appreciate".

#### urgency_style
- **Type:** phrases used to signal urgency; enum preference {"ASAP", "by EOD", "whenever works"} with usage %.

#### authority_expression (moved from Decision)
- **Type:** preference between "Could you…", "Please…", "We need to…", "I will…".
- **Why:** governs request tone in generated drafts.

### 4.4 Email Length & Structure

#### avg_word_count
- **Scope:** per‑relationship & per‑topic
- **Type:** mean ± std.

#### sentence_count_preference
- **Type:** distribution of sentences per email.

#### paragraph_style
- **Type:** enum {one‑block, short‑paragraphs, multi‑para}.

#### bullet_point_usage
- **Type:** frequency and bullet style {"-", "•", numbered}.

#### line_break_patterns
- **Type:** typical spacing before/after greeting/sign‑off; blank lines between paras.

#### sentence_variability (new)
- **Type:** coefficient of variation of sentence length.
- **Why:** helps mimic rhythm (staccato vs flowing).

### 4.5 Language & Vocabulary

#### common_phrases
- **Type:** top n‑grams with weights; flagged as positive/neutral/avoid.

#### signature_words
- **Type:** TF‑IDF top terms specific to user vs peers.

#### abbreviation_usage
- **Type:** normalized frequency + preferred expansions.

#### technical_language_level
- **Type:** 1–10 based on jargon density.

#### contractions_usage
- **Type:** % contractions vs formal forms.

#### locale_spelling_preference (new)
- **Type:** {en‑US vs en‑GB vs mixed} with examples ("color/colour", "organize/organise").

#### style_embedding (new & critical)
- **Type:** 768‑dim (example) vector representing user's style from sent emails.
- **Use:** similarity search & few‑shot retrieval for reply generation.

### 4.6 Relationship‑Specific Variables

#### relationship_classification
- **Type:** distribution over {boss, colleague, direct_report, client, vendor, friend, family, unknown}.
- **Extraction:** LLM + heuristics (domain, org chart if available).

#### communication_history_summary
- **Type:** short synopsis per contact (topics, tone, recent decisions).

#### response_time_patterns
- **Type:** median & distribution (minutes/hours) per contact/role; weekday/time‑of‑day heatmap.

#### topic_formality_mapping
- **Type:** topic → avg formality_score (e.g., invoices, scheduling, social).
- **Extraction:** LDA/LLM topic tags on subjects/threads.

#### contact_grouping (new)
- **Type:** clusters by domain/role to generalize style to new but similar contacts.

### 4.7 Response Context Patterns

#### response_triggers
- **Type:** cues that drive quick replies (mentions of deadlines, VIP senders).

#### response_length_correlation
- **Type:** mapping from incoming length → outgoing length class.

#### escalation_patterns
- **Type:** patterns of tone shift when issues arise; preferred escalation steps.

#### follow_up_style
- **Type:** proactive vs reactive; typical follow‑up interval and phrasing.

### 4.8 Emotional & Social Variables

#### emoji_usage_frequency
- **Type:** rate & allowed emoji set (if any).

#### exclamation_point_usage
- **Type:** per‑1000‑word frequency, max per email.

#### positive_language_markers
- **Type:** rate of positive adjectives; sentiment mean ± std.

#### concern_expression_style
- **Type:** patterns like "flagging", "heads‑up", "concerned about…".

#### appreciation_expression
- **Type:** preferred thanking formulas and placement.

#### humor_usage
- **Type:** frequency & safe boundaries (light vs none).

### 4.9 Context‑Aware Variables

#### meeting_request_style
- **Type:** date/time phrasing preference; proposes slots vs asks for options; prefers calendar links vs back‑and‑forth.

#### deadline_communication
- **Type:** precise dates vs relative ("by Friday"); buffer preference.

#### problem_escalation_tone
- **Type:** diplomatic vs direct; includes proposed fixes vs logs only.

#### praise_giving_style
- **Type:** private vs public CC; adjectives used.

#### information_sharing_pattern
- **Type:** brief vs detailed; uses TL;DR; uses attachments vs inline bullets.

### 4.10 Thread Position Variables

#### thread_starter_style
- **Type:** subject line patterns; opening context sentences.

#### thread_continuation_style
- **Type:** inline replies vs top‑posting; quoted text usage.

#### thread_closing_style
- **Type:** explicit closure phrase ("how they end conversations").

## Next: Timing & Priority Variables

### 12. Communication Timing Patterns
- **response_urgency_indicators** (words that show priority)
- **time_reference_style** ("ASAP" vs "when convenient")
- **scheduling_language** (flexible vs specific times)
- **availability_expression** (how they share their schedule)

### Advanced Pattern Variables

### 13. Decision-Making Style
- **decision_language** ("I think" vs "I recommend" vs "We should")
- **consensus_building_approach** (asks for input vs makes statements)
- **authority_expression** (how they give directions/requests)

### 14. Problem-Solving Communication
- **issue_reporting_style** (detailed vs summary)
- **solution_presentation** (multiple options vs single recommendation)
- **risk_communication** (how they express concerns)