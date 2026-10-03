-- Article « Bien conserver son miel » : l'avertissement sur les nourrissons
-- précise que certains médecins conseillent d'attendre deux ans.
UPDATE "blog_posts"
SET "content" = jsonb_build_object(
      'ar', replace("content"->>'ar',
        $kz$لا تُعطِ العسل أبداً لطفل دون السنة من عمره.$kz$,
        $kz$لا تُعطِ العسل أبداً لطفل دون السنة من عمره، ويوصي بعض الأطباء بالانتظار حتى سنتين. استشر طبيب الأطفال.$kz$),
      'fr', replace("content"->>'fr',
        $kz$Ne donnez jamais de miel à un enfant de moins d’un an.$kz$,
        $kz$Ne donnez jamais de miel à un enfant de moins d’un an ; certains médecins conseillent même d’attendre ses deux ans. Demandez l’avis de votre pédiatre.$kz$),
      'en', replace("content"->>'en',
        $kz$Never give honey to a child under one year old.$kz$,
        $kz$Never give honey to a child under one year old; some doctors even advise waiting until age two. Ask your paediatrician.$kz$)
    ),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'bien-conserver-son-miel';
