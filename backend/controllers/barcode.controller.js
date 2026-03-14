const bwipjs = require('bwip-js');

exports.generateBarcode = (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'Text query parameter is required' });
  }

  bwipjs.toBuffer({
    bcid: 'code128',       // Barcode type
    text: text,            // Text to encode
    scale: 3,              // 3x scaling factor
    height: 10,            // Bar height, in millimeters
    includetext: true,     // Show human-readable text
    textxalign: 'center',  // Always good to set this
  }, function (err, png) {
    if (err) {
      console.error('Barcode generation error:', err);
      return res.status(500).json({ error: 'Failed to generate barcode' });
    }
    
    res.set('Content-Type', 'image/png');
    res.send(png);
  });
};
