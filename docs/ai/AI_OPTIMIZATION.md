# AI Optimization Guide

## Current AI Stack

### Primary AI Provider: Groq + LLaMA 3.1 8B
- **Speed**: 500+ tokens/sec (much faster than OpenAI)
- **Cost**: Free tier: 30 requests/min, then $0.27/1M tokens
- **Quality**: Excellent for email analysis and structured output
- **Model**: `llama3-8b-8192` (8K context window)

### Optimization Strategies

#### 1. Rate Limiting
```typescript
const RATE_LIMIT = {
  requests: 0,
  resetTime: Date.now() + 60000,
  maxRequests: 25 // Stay under Groq's 30/min limit
};
```

#### 2. Content Optimization
- **Email Truncation**: Limit emails to 2000 characters (~500 tokens)
- **Smart Truncation**: Preserve important parts (subject, first/last paragraphs)
- **Token Estimation**: ~4 characters = 1 token for English text

#### 3. Caching Strategy
- **In-Memory Cache**: 24-hour TTL for email analysis
- **Cache Key**: Content hash to avoid duplicate analysis
- **Cache Size**: Max 1000 entries with automatic cleanup

#### 4. Context Window Management
For response generation, optimal context includes:
- Current email: ~500 tokens
- 3 similar emails: ~1500 tokens
- User's past responses: ~700 tokens
- Workflow template: ~200 tokens
- **Total**: ~3000 tokens (well within 8K limit)

## Token Usage Optimization

### Email Analysis
```
Input: ~500 tokens (optimized email)
Output: ~100 tokens (JSON response)
Total: ~600 tokens per analysis
```

### Response Generation
```
Input: ~3000 tokens (context + email)
Output: ~300 tokens (email response)
Total: ~3300 tokens per generation
```

### Daily Usage Estimation
For 100 emails/day:
- Analysis: 100 × 600 = 60K tokens
- Response Generation: 50 × 3300 = 165K tokens
- **Total**: ~225K tokens/day = ~$0.06/day

## Performance Monitoring

### Key Metrics
- **Response Time**: Target <2 seconds for analysis
- **Cache Hit Rate**: Target >30% for similar emails
- **Rate Limit Usage**: Stay under 80% of limits
- **Token Efficiency**: Monitor tokens per request

### Monitoring Implementation
```typescript
// Track usage metrics
const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  averageTokens: 0,
  rateLimitHits: 0
};
```

## Fallback Strategy

### Provider Hierarchy
1. **Primary**: Groq + LLaMA 3.1 8B (fast, cheap)
2. **Fallback**: OpenAI GPT-4o (higher quality, more expensive)
3. **Emergency**: Local Ollama model (offline capability)

### Automatic Fallback Triggers
- Rate limit exceeded
- API downtime
- Quality threshold not met
- User preference (premium users)

## Cost Management

### Free Tier Limits
- **Groq**: 30 requests/min, generous daily limit
- **OpenAI**: $5 credit for new accounts
- **Target**: Stay within free tiers for MVP

### Scaling Strategy
1. **0-100 users**: Free tiers only
2. **100-1000 users**: Groq paid tier ($0.27/1M tokens)
3. **1000+ users**: Multi-provider load balancing

## Quality Assurance

### Response Validation
- JSON schema validation
- Confidence score thresholds
- User feedback integration
- A/B testing different prompts

### Continuous Improvement
- Monitor user edit rates on AI responses
- Collect feedback on draft quality
- Adjust prompts based on performance
- Fine-tune context selection

## Implementation Checklist

- [x] Groq API integration
- [x] Rate limiting implementation
- [x] Content optimization
- [x] In-memory caching
- [ ] Token usage monitoring
- [ ] Fallback provider setup
- [ ] Quality metrics tracking
- [ ] Cost alerting system

## Environment Configuration

```env
# AI Provider Configuration
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama3-8b-8192

# Fallback Configuration
OPENAI_API_KEY=your_openai_key_for_fallback
ENABLE_FALLBACK=true

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=25
CACHE_TTL_HOURS=24
```

## Best Practices

1. **Always cache analysis results** to avoid duplicate API calls
2. **Implement rate limiting** to stay within provider limits
3. **Optimize prompts** for consistent JSON output
4. **Monitor token usage** to control costs
5. **Use fallback providers** for reliability
6. **Track quality metrics** for continuous improvement
7. **Implement user feedback loops** for learning

## Troubleshooting

### Common Issues
1. **Rate Limit Exceeded**: Implement exponential backoff
2. **Invalid JSON Response**: Improve prompt clarity
3. **High Token Usage**: Optimize content truncation
4. **Slow Response Times**: Check network latency
5. **Low Quality Responses**: Adjust temperature/prompts

### Debug Commands
```bash
# Test Groq integration
npm run test-groq

# Monitor token usage
npm run monitor-tokens

# Check cache performance
npm run cache-stats
```