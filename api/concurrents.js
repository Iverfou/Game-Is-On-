// API Route Vercel — /api/concurrents
// Retourne la liste des concurrents avec leurs statistiques de veille

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_CONCURRENTS,
    AIRTABLE_TABLE_VEILLE
  } = process.env;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_CONCURRENTS) {
    return res.status(500).json({ error: 'Variables d\'environnement manquantes.' });
  }

  try {
    // Récupérer les concurrents (pas de champs dupliqués ici)
    const concParams = new URLSearchParams({
      'filterByFormula': '{Actif}=1',
      'sort[0][field]': 'Priorité',
      'sort[0][direction]': 'asc'
    });

    const concUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_CONCURRENTS}?${concParams}`;
    const concResponse = await fetch(concUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });

    if (!concResponse.ok) {
      return res.status(concResponse.status).json({ error: 'Erreur lecture concurrents' });
    }

    const concData = await concResponse.json();

    // Calculer la semaine courante
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const semaineCourante = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    // Récupérer les stats de veille — CORRECTION : utiliser .append() pour champs multiples
    let veilleStats = {};
    if (AIRTABLE_TABLE_VEILLE) {
      const veilleParams = new URLSearchParams();
      veilleParams.append('maxRecords', '200');
      // Champs réels dans VEILLE_HEBDO
      veilleParams.append('fields[]', 'Titre');
      veilleParams.append('fields[]', 'Concurrent');
      veilleParams.append('fields[]', 'Semaine');
      veilleParams.append('fields[]', 'Score importance');
      veilleParams.append('fields[]', 'Statut');
      veilleParams.append('fields[]', 'Date détection');

      const veilleUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_VEILLE}?${veilleParams}`;
      const veilleResponse = await fetch(veilleUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
      });

      if (veilleResponse.ok) {
        const veilleData = await veilleResponse.json();
        for (const rec of (veilleData.records || [])) {
          // "Concurrent" est un champ linked records → array [{id, name}]
          const concurrentLinks = rec.fields['Concurrent'];
          if (!concurrentLinks || !Array.isArray(concurrentLinks)) continue;

          for (const link of concurrentLinks) {
            const nomKey = link.name || link;
            if (!nomKey) continue;
            if (!veilleStats[nomKey]) {
              veilleStats[nomKey] = {
                total_changements: 0,
                cette_semaine: 0,
                score_max: 0,
                derniere_detection: null
              };
            }
            veilleStats[nomKey].total_changements++;
            if (rec.fields['Semaine'] === semaineCourante) {
              veilleStats[nomKey].cette_semaine++;
            }
            const score = rec.fields['Score importance'] || 0;
            if (score > veilleStats[nomKey].score_max) {
              veilleStats[nomKey].score_max = score;
            }
            const dateDetection = rec.fields['Date détection'];
            if (dateDetection && (!veilleStats[nomKey].derniere_detection || dateDetection > veilleStats[nomKey].derniere_detection)) {
              veilleStats[nomKey].derniere_detection = dateDetection;
            }
          }
        }
      }
    }

    // Enrichir les concurrents avec leurs stats
    const enriched = (concData.records || []).map(rec => ({
      id: rec.id,
      nom: rec.fields['Nom'] || '',
      secteur: rec.fields['Secteur'] || '',
      site_web: rec.fields['Site Web'] || '',
      instagram: rec.fields['Instagram Handle'] || '',
      facebook: rec.fields['Facebook URL'] || '',
      priorite: rec.fields['Priorité'] || 'Moyenne',
      derniere_verification: rec.fields['Dernière vérification'] || null,
      stats: veilleStats[rec.fields['Nom']] || {
        total_changements: 0,
        cette_semaine: 0,
        score_max: 0,
        derniere_detection: null
      }
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      concurrents: enriched,
      total: enriched.length,
      semaine_courante: semaineCourante,
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
}
