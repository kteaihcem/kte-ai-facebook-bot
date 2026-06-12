# KTE-AI Facebook Messenger Bot

Webhook trung gian kết nối:

Facebook Messenger Fanpage → Railway Server → Dify KTE-AI → Messenger trả lời tự động.

## Biến môi trường trên Railway

- VERIFY_TOKEN: mã xác minh tự đặt, ví dụ `kte-ai-hcem-verify-2026`
- PAGE_ACCESS_TOKEN: token của Fanpage trong Meta Developer
- DIFY_API_KEY: API Key của chatbot KTE-AI trong Dify
- DIFY_BASE_URL: `https://api.dify.ai/v1`

## URL Webhook

Sau khi deploy Railway, URL webhook sẽ là:

`https://<ten-du-an>.up.railway.app/webhook`
