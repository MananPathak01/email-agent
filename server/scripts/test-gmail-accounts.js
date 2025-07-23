import fetch from 'node-fetch';

// Paste your Firebase ID token here (get it from your frontend after login)
const idToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjZkZTQwZjA0ODgxYzZhMDE2MTFlYjI4NGE0Yzk1YTI1MWU5MTEyNTAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTWFuYW4gUGF0aGFrIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0szdG5vWHJyRW9LMlV2eklHWTZUczlSNC1nWW1ZQndiMXMtd0RhVUQ3Y1hEUnEzNUhJPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2VtYWlsLWFnZW50LTk0OTVhIiwiYXVkIjoiZW1haWwtYWdlbnQtOTQ5NWEiLCJhdXRoX3RpbWUiOjE3NTMyMDk4ODksInVzZXJfaWQiOiJKZWNQaDVSMUJCZHFyVG5PNjh3T1ptMW00dmwxIiwic3ViIjoiSmVjUGg1UjFCQmRxclRuTzY4d09abTFtNHZsMSIsImlhdCI6MTc1MzI2MjcwNiwiZXhwIjoxNzUzMjY2MzA2LCJlbWFpbCI6InBhdGhha21hbmFuNUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjExMjQ3NTM4MTk2NjM2MTU2MTkzOSJdLCJlbWFpbCI6WyJwYXRoYWttYW5hbjVAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.Qpebj1hD87dI_U0DqCbByOYUKquO27qbddKGBTd9LvPr5eimtJDAoQljH7txjaV5FTh7NvR1tq4LvPlfP16r72zIali4-fuuMucGJxIM_A6SOHcAVcBD2mU3be_CJe6B4ObO0kHL6go5x6ab-UZMSMXVMqGKaCKD8Bq4DN607QyLmkJe_lCphhmiQorwyO_jCtT6kItaOhgkhENnLNGmB53SORzmrznp98P46lLbN5S7GMXXB5CcZLIonJQmRxkZpez2dzwUJQZDGVxUitU7zXUv6ky2fxm-brIlm5YWgGQo-pL5RUwSAIZw-wJNT5UzeC3NKMZvWXD5dXjhtBnHzQ"
async function fetchGmailAccounts() {
  const res = await fetch('http://localhost:3000/api/gmail/accounts', {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    console.error('Failed to fetch accounts:', res.status, await res.text());
    return;
  }

  const accounts = await res.json();
  console.log('Gmail accounts API response:', JSON.stringify(accounts, null, 2));
}

fetchGmailAccounts(); 