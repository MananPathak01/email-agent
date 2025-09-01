# MVP Context Optimization Plan

## Guiding Principle

For the MVP, our primary goal is to create a reliable, end-to-end email generation system that is both simple to implement and cost-effective. We will achieve this by separating the deep analysis of a user's style from the real-time generation of email drafts.

Instead of implementing a complex vector search infrastructure for the MVP, we will use a high-level **Summary Profile** to provide the necessary context to the LLM during draft generation. This approach minimizes complexity and cost while delivering a valuable core feature.

--- 

## Phase 1: One-Time Profile Generation (The "Heavy" Analysis)

This is a one-time, comprehensive process that runs in the background when a user connects a new email account.

**Trigger:** A user connects a new Gmail account (up to a maximum of 3 accounts per user).

### Steps:

1.  **Fetch Emails:** The system will fetch the user's most recent ~50 sent emails from the newly connected account.

2.  **Deep Analysis:** The collected email data is sent to the Groq LLM for a deep analysis of the user's communication style for that specific account.

3.  **Validate Response:** The JSON response from the LLM is rigorously **validated against a Zod schema**. This is a critical step to ensure the data is well-structured and reliable before it's saved, preventing errors from malformed AI responses.

4.  **Generate and Store Profiles:** Upon successful validation, two distinct profile artifacts are generated and stored in the database, associated with that specific email account (`users/{uid}/email_accounts/{aid}/`):
    *   **`full_communication_profile`**: The complete, detailed JSON object containing the entire analysis. This is a valuable asset saved for future analytics and for upgrading to more advanced generation techniques post-MVP.
    *   **`summary_communication_profile`**: A small, lightweight JSON object containing only the most important, high-level patterns (e.g., overall formality, directness, preferred greetings/closings).

--- 

## Phase 2: Real-Time Draft Generation (The "Lean" MVP Approach)

This is the fast and efficient process that runs every time the system needs to generate a reply to an incoming email.

**Trigger:** A new email arrives in a connected user's inbox.

### Steps:

1.  **Identify Account:** The system identifies which of the user's connected accounts received the email (e.g., `user@work.com`).

2.  **Fetch Summary Profile:** It retrieves the corresponding `summary_communication_profile` for that specific account from the database.

3.  **Construct Lean Prompt:** A simple, cost-effective prompt is constructed for the LLM, containing only two key pieces of information:
    *   The content of the new incoming email.
    *   The high-level style rules from the **Summary Profile**.

4.  **Generate Draft:** The LLM uses this lean context to generate a draft that is consistent with the user's general style for that account.

## Post-MVP Scalability

This architecture is designed to evolve. The `full_communication_profile` and the initial email analysis we perform in Phase 1 are valuable assets. After the MVP is validated, they will be used to implement a more advanced **vector search** capability for finding similar past emails, which will further enhance the quality and nuance of the AI-generated drafts.
