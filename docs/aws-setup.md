# Switching Amazon Nova on

About 20 minutes. Without this, GAID still works and answers from the
gallery's own words only.

1. Sign in at <https://console.aws.amazon.com> with billing switched on.
2. Top right, set the region to **US East (N. Virginia) us-east-1**.
3. Open **Amazon Bedrock**. If it asks you to request model access, turn on
   **Amazon Nova Lite**.
4. In Bedrock, open **API keys** and generate a **long-term API key**. Set it
   to expire after the judging period (judging is reported as 9–20 November
   2026). Copy it once; it is not shown again.
   Amazon's guide: <https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html>
5. In Vercel, open the GAID project → **Settings → Environment Variables** and
   add `AWS_BEARER_TOKEN_BEDROCK` with the key as its value, for Production
   and Preview. Redeploy.
6. Never paste the key into a chat, an email, the code or this repository.

Check it worked: open the site, stand in front of a work and ask something the
gallery did not write down, such as "Why those colours?". Under the answer it
says **Answered by Amazon Nova** when the model replied.

Cost: each question is a small charge. Prices:
<https://aws.amazon.com/bedrock/pricing/>. `GAID_PER_MINUTE` (default 20) caps
how many questions one caller can send a minute.
