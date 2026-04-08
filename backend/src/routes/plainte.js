router.get('/', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*, t.nom_type, l.province
    FROM plainte_grm p
    JOIN type_plainte t ON p.id_type_plainte = t.id_type_plainte
    JOIN localisation l ON p.id_localisation = l.id_localisation
    ORDER BY p.date_reception DESC
  `)

  res.json(rows)
})