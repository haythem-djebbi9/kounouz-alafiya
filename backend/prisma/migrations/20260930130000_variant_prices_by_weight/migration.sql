-- Prix des formats selon leur poids.
--
-- Les formats (SKU) des produits de démonstration avaient tous été créés au
-- prix du produit : un pot de 500 g coûtait autant qu'un pot de 250 g. Le plus
-- petit format garde son prix ; les plus grands suivent le poids, avec 10 %
-- de remise au volume, arrondis au demi-dinar.
--
-- Ne touche qu'aux produits dont TOUS les formats ont exactement le même prix
-- pour des poids différents : un prix saisi à la main n'est jamais modifié.
-- Les commandes passées ne changent pas : chaque ligne a figé son prix.
WITH groupes AS (
  SELECT product_id, MIN(net_weight_g) AS poids_base, MIN(price) AS prix_base
  FROM "product_variants"
  WHERE net_weight_g IS NOT NULL AND net_weight_g > 0
  GROUP BY product_id
  HAVING COUNT(*) > 1 AND COUNT(DISTINCT price) = 1 AND COUNT(DISTINCT net_weight_g) > 1
)
UPDATE "product_variants" AS v
SET price = ROUND(g.prix_base * v.net_weight_g / g.poids_base * 0.9 * 2) / 2,
    updated_at = CURRENT_TIMESTAMP
FROM groupes AS g
WHERE v.product_id = g.product_id
  AND v.net_weight_g > g.poids_base;
