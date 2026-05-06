// API Route Vercel — /api/veille
// Proxy sécurisé vers Airtable (le token reste côté serveur)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const {
    AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_VEILLE
  } = process.env;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_VEILLE) {
    return res.status(500).json({
      error: 'Variables d\'environnement manquantes. Configurer AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_VEILLE dans Vercel.'
    });
  }

  // Paramètres de filtrage depuis le frontend
  const { semaine, source, secteur, type, limit = '100' } = req.query;

  // Construire le filtre Airtable
  const filters = [];
  if (semaine) filters.push(`{Semaine}='${semaine}'`);
  if (source) filters.push(`{Source}='${source}'`);
  if (type) filters.push(`{Type de changement}='${type}'`);

  let filterFormula = '';
  if (filters.length === 1) filterFormula = filters[0];
  else if (filters.length > 1) filterFormula = `AND(${filters.join(',')})`;

  // Construire les paramètres de requête
  const params = new URLSearchParams({
    'sort[0][field]': 'Date détection',
    'sort[0][direction]': 'desc',
    'maxRecords': Math.min(parseInt(limit), 200).toString(),
    'fields[]': 'Nom concurrent (lookup)',
    'fields[]': 'Secteur (lookup)',
    'fields[]': 'Date détection',
    'fields[]': 'Semaine',
    'fields[]': 'Source',
    'fields[]': 'Type de changement',
    'fields[]': 'Contenu détecté',
    'fields[]': 'Lien source',
    'fields[]': 'Score importance',
    'fields[]': 'Résumé Claude',
    'fields[]': 'Recommandation action',
    'fields[]': 'Statut',
    'fields[]': 'Inclus dans rapport'
  });

  if (filterFormula) params.append('filterByFormula', filterFormula);

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_VEILLE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Erreur Airtable: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // Enrichir avec des métadonnées
    const enriched = {
      records: data.records || [],
      total: (data.records || []).length,
      semaines_disponibles: [...new Set((data.records || []).map(r => r.fields['Semaine']).filter(Boolean))].sort().reverse(),
      sources_disponibles: [...new Set((data.records || []).map(r => r.fields['Source']).filter(Boolean))],
      types_disponibles: [...new Set((data.records || []).map(r => r.fields['Type de changement']).filter(Boolean))],
      stats: {
        urgents: (data.records || []).filter(r => (r.fields['Score importance'] || 0) >= 4).length,
        nouveaux: (data.records || []).filter(r => r.fields['Statut'] === 'Nouveau').length,
        instagram: (data.records || []).filter(r => r.fields['Source'] === 'Instagram').length,
        facebook: (data.records || []).filter(r => r.fields['Source'] === 'Facebook').length,
        sites_web: (data.records || []).filter(r => r.fields['Source'] === 'Site Web').length
      },
      fetched_at: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(enriched);

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur réseau lors de l\'appel Airtable',
      details: error.message
    });
  }
}
