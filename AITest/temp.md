```

```
export TOKENHUB_API_KEY="sk-xc-••••"

curl https://tokenhub.xincheng.com/gateway/v1/chat/completions \
  -H "Authorization: Bearer $TOKENHUB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tencent-deepseek-v4.1-flash","messages":[{"role":"user","content":"你好"}]}'
```