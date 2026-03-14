const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.listConversions = async (req, res) => {
  try {
    const { product_id } = req.query;
    let query = `
      SELECT uc.*, p.name as product_name, p.sku
      FROM unit_conversions uc
      LEFT JOIN products p ON uc.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (product_id) { query += ` AND uc.product_id = ?`; params.push(product_id); }
    query += ` ORDER BY uc.from_unit, uc.to_unit`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to list conversions' });
  }
};

exports.createConversion = async (req, res) => {
  try {
    const { from_unit, to_unit, factor, product_id } = req.body;
    if (!from_unit || !to_unit || !factor) return res.status(400).json({ error: 'from_unit, to_unit, and factor are required' });
    const id = uuidv4();
    db.query(`INSERT INTO unit_conversions (id, from_unit, to_unit, factor, product_id) VALUES (?,?,?,?,?)`,
      [id, from_unit, to_unit, factor, product_id || null]);
    // Auto-create inverse
    const invId = uuidv4();
    try {
      db.query(`INSERT INTO unit_conversions (id, from_unit, to_unit, factor, product_id) VALUES (?,?,?,?,?)`,
        [invId, to_unit, from_unit, 1 / factor, product_id || null]);
    } catch (e) { /* inverse may already exist */ }
    res.status(201).json({ id, message: 'Conversion created' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to create conversion' });
  }
};

exports.deleteConversion = async (req, res) => {
  try {
    const { id } = req.params;
    db.query(`DELETE FROM unit_conversions WHERE id = ?`, [id]);
    res.json({ message: 'Conversion deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to delete conversion' });
  }
};

exports.convert = async (req, res) => {
  try {
    const { from_unit, to_unit, quantity, product_id } = req.query;
    if (!from_unit || !to_unit || !quantity) return res.status(400).json({ error: 'from_unit, to_unit, and quantity required' });
    // Try product-specific first, then global
    let conversion;
    if (product_id) {
      const { rows } = db.query(`SELECT * FROM unit_conversions WHERE from_unit = ? AND to_unit = ? AND product_id = ?`, [from_unit, to_unit, product_id]);
      if (rows.length) conversion = rows[0];
    }
    if (!conversion) {
      const { rows } = db.query(`SELECT * FROM unit_conversions WHERE from_unit = ? AND to_unit = ? AND product_id IS NULL`, [from_unit, to_unit]);
      if (rows.length) conversion = rows[0];
    }
    if (!conversion) return res.status(404).json({ error: `No conversion found from ${from_unit} to ${to_unit}` });
    res.json({ from_unit, to_unit, original_quantity: parseFloat(quantity), converted_quantity: parseFloat(quantity) * conversion.factor, factor: conversion.factor });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to convert' });
  }
};
