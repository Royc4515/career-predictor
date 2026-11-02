# Pollinations key: setup checklist

Everything on the code side is done. These are the steps only the account
owner can do (they need your Pollinations sign-in and your Render dashboard).

## 1. Create the key (about 3 minutes)

1. Open https://enter.pollinations.ai/keys and sign in (GitHub sign-in).
2. Create a **secret** key. It must start with `sk_`. A `pk_` "app key" is a
   public client id and the API rejects it.
3. Recommended settings for this site:
   - **Name:** `careerpredict-render` (any name works; it shows in the check).
   - **Models:** restrict to image generation, or just
     `tongyi-mai/z-image-turbo` (the default model this site uses).
   - **Account permissions:** none. The site only generates images.
   - **Spending:** limit the key to free Quest Pollen if the dashboard offers
     it (`questPollenOnly` in the API). The key then can never charge money;
     when the free balance runs out the site falls back to the keyless model
     instead of failing.
   - **Budget:** leave it empty (unlimited, still free-only with Quest Pollen).
     Do not enter 0: that is a budget of nothing and every render would fail.
     A positive cap such as 100 also works.
4. Copy the key once. It is shown only at creation.

The default model, `tongyi-mai/z-image-turbo`, is not paid-only, so it runs on
the free balance. To use another model set `POLLINATIONS_IMAGE_MODEL` (live list
with prices: https://gen.pollinations.ai/image/models).

## 2. Check it locally (optional, 30 seconds)

```
cd server
echo "POLLINATIONS_API_KEY=sk_..." >> .env
npm run check:image
```

The check confirms the key is a valid secret key, that it may use the
configured model, and that the model is not paid-only for a free-only key. It
never prints the key. Add `-- --generate` to render one real portrait (spends a
little pollen) and see the output path.

`server/.env` is gitignored; never commit the key.

## 3. Add it on Render

1. Render dashboard, the CareerPredict web service, **Environment**.
2. Add `POLLINATIONS_API_KEY` with the `sk_` value. Leave
   `IMAGE_PROVIDER_CHAIN` unset: with only the key, the chain becomes
   `pollinations_gen -> pollinations` automatically.
3. Save. Render redeploys.
4. In the deploy log look for:
   - `[IMAGE] provider chain: pollinations_gen -> pollinations` (the key was
     picked up), then, after the first quiz,
   - `[IMAGE] ok provider=pollinations_gen ...` (a portrait was made with it).

If you see `[IMAGE] error provider=pollinations_gen ... 401`, the key is wrong
or revoked; `402` or a balance error means the free pollen ran out (the site
keeps working on the keyless model meanwhile).

## Note on cached images

Portraits are cached by content hash. Images generated before the key was set
stay as they are until the cache is cleared; on Render's free tier the disk
cache is wiped on every redeploy, so adding the key (which triggers a
redeploy) clears it.
