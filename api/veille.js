// API Route Vercel — /api/veille
// Proxy sécurisé vers Airtable (le token reste côté serveur)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

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

  const { semaine, source, type, limit = '100' } = req.query;

  // Construire le filtre Airtable
  const filters = [];
  if (semaine) filters.push(`{Semaine}='${semaine}'`);
  if (source) filters.push(`{Source}='${source}'`);
  if (type) filters.push(`{Type de changement}='${type}'`);

  let filterFormula = '';
  if (filters.length === 1) filterFormula = filters[0];
  else if (filters.length > 1) filterFormula = `AND(${filters.join(',')})`;

  // CORRECTION : utiliser .append() pour les clés dupliquées (fields[])
  // Un objet JS ne supporte pas les clés dupliquées — seule la dernière valeur survit
  const params = new URLSearchParams();
  params.append('sort[0][field]', 'Date détection');
  params.append('sort[0][direction]', 'desc');
  params.append('maxRecords', String(Math.min(parseInt(limit) || 100, 200)));
  // Champs réels dans Airtable VEILLE_HEBDO
  params.append('fields[]', 'Titre');
  params.append('fields[]', 'Concurrent');
  params.append('fields[]', 'Date détection');
  params.append('fields[]', 'Semaine');
  params.append('fields[]', 'Source');
  params.append('fields[]', 'Type de changement');
  params.append('fields[]', 'Contenu détecté');
  params.append('fields[]', 'Avis clients');
  params.append('fields[]', 'Lien source');
  params.append('fields[]', 'Score importance');
  params.append('fields[]', 'Statut');
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
    const records = data.records || [];

    // Normaliser les champs pour le frontend
    const normalized = records.map(r => ({
      id: r.id,
      createdTime: r.createdTime,
      fields: {
        titre: r.fields['Titre'] || '',
        concurrent: Array.isArray(r.fields['Concurrent'])
          ? r.fields['Concurrent'].map(c => c.name || c).join(', ')
          : (r.fields['Concurrent'] || ''),
        date_detection: r.fields['Date détection'] || null,
        semaine: r.fields['Semaine'] || '',
        source: r.fields['Source'] || '',
        type_changement: r.fields['Type de changement'] || '',
        contenu: r.fields['Contenu détecté'] || '',
        avis_clients: r.fields['Avis clients'] || '',
        lien_source: r.fields['Lien source'] || '',
        score_importance: r.fields['Score importance'] || 0,
        statut: r.fields['Statut'] || 'Nouveau',
        // Compat. ancienne API (keep raw fields too)
        ...r.fields
      }
    }));

    const enriched = {
      records: normalized,
      total: normalized.length,
      semaines_disponibles: [...new Set(normalized.map(r => r.fields.semaine).filter(Boolean))].sort().reverse(),
      sources_disponibles: [...new Set(normalized.map(r => r.fields.source).filter(Boolean))],
      types_disponibles: [...new Set(normalized.map(r => r.fields.type_changement).filter(Boolean))],
      stats: {
        urgents: normalized.filter(r => (r.fields.score_importance || 0) >= 4).length,
        nouveaux: normalized.filter(r => r.fields.statut === 'Nouveau').length,
        instagram: normalized.filter(r => r.fields.source === 'Instagram').length,
        facebook: normalized.filter(r => r.fields.source === 'Facebook').length,
        sites_web: normalized.filter(r => r.fields.source === 'Site Web').length
      },
      fetched_at: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(enriched);

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur réseau lors de l\'appel Airtable',
      details: error.message
    });
  }
}
