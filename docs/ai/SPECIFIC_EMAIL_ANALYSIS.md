# Specific Email Account Analysis

## 🎯 **Problem Solved**

Previously, when users had multiple Gmail accounts connected, the system would always analyze the first account found in the database, not necessarily the newly added one. This has been fixed to allow analysis of specific email accounts.

## 🔧 **How It Works Now**

### **1. Automatic Most Recent Account**
When no specific email is provided, the system analyzes the **most recently connected** Gmail account:

```bash
POST /api/gmail/learn-emails
```

### **2. Specific Email Account**
You can now specify which email account to analyze:

```bash
POST /api/gmail/learn-emails
Content-Type: application/json

{
  "email": "pathakmanan5t@gmail.com"
}
```

Or via URL parameter:
```bash
POST /api/gmail/learn-emails/pathakmanan5t@gmail.com
```

## 📊 **System Behavior**

### **Token Retrieval Logic**
1. **Specific Email Requested**: Uses `getStoredTokensForEmail(userId, email)`
   - Searches for exact email match in user's Gmail accounts
   - Returns tokens for that specific account
   - Fails if email not found

2. **No Email Specified**: Uses `getStoredTokens(userId)`
   - Orders accounts by `lastConnectedAt` descending
   - Returns tokens for most recently connected account
   - Includes email identification in response

### **File Naming Convention**
Files are now saved with email-based identifiers:

- **Email Data**: `writing-style-data-{email-identifier}-{timestamp}.json`
- **Profile**: `communication-profile-{email-identifier}-{timestamp}.json`
- **Summary**: `summary-communication-profile-{email-identifier}-{timestamp}.json`

Where `{email-identifier}` is the email address with `@` and `.` replaced by `-`:
- `pathakmanan5t@gmail.com` → `pathakmanan5t-gmail-com`

## 🔍 **Logging & Debugging**

The system now provides clear logging to show which account is being analyzed:

```
🎯 Learning request for specific email: pathakmanan5t@gmail.com
📧 Found Gmail account: pathakmanan5t@gmail.com
🔍 Creating communication profile for: pathakmanan5t@gmail.com
📧 Successfully analyzed emails from pathakmanan5t@gmail.com
```

## 📱 **Frontend Integration**

### **Analyze Specific Account**
```typescript
const analyzeSpecificAccount = async (email: string) => {
  const response = await fetch('/api/gmail/learn-emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  if (response.ok) {
    console.log(`Started analysis for ${email}`);
    // Poll for progress...
  }
};

// Usage
await analyzeSpecificAccount('pathakmanan5t@gmail.com');
```

### **Analyze Most Recent Account**
```typescript
const analyzeMostRecent = async () => {
  const response = await fetch('/api/gmail/learn-emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    console.log('Started analysis for most recent account');
    // Poll for progress...
  }
};
```

## 🗃️ **Database Structure**

Gmail accounts are stored in Firestore with proper ordering:

```
users/{userId}/email_accounts/{accountId}
{
  "email": "pathakmanan5t@gmail.com",
  "provider": "gmail",
  "accessToken": "encrypted_token",
  "refreshToken": "encrypted_token",
  "lastConnectedAt": Timestamp,
  "isActive": true
}
```

The system uses `orderBy('lastConnectedAt', 'desc')` to get the most recent account when no specific email is requested.

## ✅ **Testing**

### **Test Specific Email Logic**
```bash
npm run test-specific-email
```

This verifies:
- ✅ Email parameter extraction from request body
- ✅ File identifier generation
- ✅ Expected system behavior

### **Test Integration**
```bash
npm run test-integrated-analysis
```

This tests the complete analysis pipeline with the new email-specific logic.

## 🚀 **Usage Examples**

### **Scenario 1: User Adds New Gmail Account**
1. User connects `pathakmanan5t@gmail.com`
2. Frontend calls: `POST /api/gmail/learn-emails` with `{"email": "pathakmanan5t@gmail.com"}`
3. System analyzes that specific account
4. Files saved with `pathakmanan5t-gmail-com` identifier

### **Scenario 2: User Has Multiple Accounts**
1. User has `pathakmanan5@gmail.com` (older) and `pathakmanan5t@gmail.com` (newer)
2. Frontend calls: `POST /api/gmail/learn-emails` (no email specified)
3. System analyzes `pathakmanan5t@gmail.com` (most recent)
4. Files saved with `pathakmanan5t-gmail-com` identifier

### **Scenario 3: Re-analyze Older Account**
1. User wants to re-analyze `pathakmanan5@gmail.com`
2. Frontend calls: `POST /api/gmail/learn-emails` with `{"email": "pathakmanan5@gmail.com"}`
3. System analyzes that specific older account
4. Files saved with `pathakmanan5-gmail-com` identifier

## 🔧 **Technical Implementation**

### **Key Changes Made**

1. **Enhanced Token Retrieval**:
   - Added `getStoredTokensForEmail()` method
   - Modified `getStoredTokens()` to order by `lastConnectedAt`
   - Added email identification in token response

2. **Updated Learning Route**:
   - Added email parameter support (body and URL params)
   - Enhanced logging for account identification
   - Modified file naming to use email identifiers

3. **Improved Error Handling**:
   - Clear error messages for missing accounts
   - Specific logging for account selection
   - Graceful fallback behavior

### **Backward Compatibility**
The system maintains full backward compatibility:
- Existing API calls without email parameter work as before
- Old file naming convention still supported
- No breaking changes to existing functionality

## 📈 **Benefits**

1. **Accurate Analysis**: Always analyzes the intended email account
2. **Clear Identification**: File names clearly show which account was analyzed
3. **User Control**: Users can specify which account to analyze
4. **Better UX**: No confusion about which account is being processed
5. **Debugging**: Clear logging shows exactly what's happening

The system now correctly handles multiple Gmail accounts and ensures users get analysis for the right email account every time!