require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

// อนุญาตให้ React เข้าถึงได้
app.use(cors());
app.use(express.json());

// เชื่อมต่อ Supabase (ใช้ Service Role Key เพื่อสิทธิ์สูงสุดในฐานะ Backend)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // กุญแจลับเฉพาะ Server
const supabase = createClient(supabaseUrl, supabaseKey);

// --- สร้าง API ---

// 1. API ดึงข้อมูลสินค้าทั้งหมด
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) throw error;
    
    res.json(data); // ส่งข้อมูลกลับไปให้ Frontend
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. API เพิ่มสินค้า (ตัวอย่าง Business Logic)
app.post('/api/products', async (req, res) => {
  const { name, price, stock } = req.body;
  
  // ตัวอย่าง: ตรวจสอบ Logic ก่อนบันทึก (สิ่งที่หัวหน้าอยากได้)
  if (price < 0) {
    return res.status(400).json({ error: "ราคาสินค้าห้ามติดลบ!" });
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{ name, price, stock }])
      .select();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เริ่มรัน Server
app.listen(port, () => {
  console.log(`Server กำลังทำงานที่ http://localhost:${port}`);
});