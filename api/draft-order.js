// 유효한 기본 이메일 사용 버전
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST만 허용' });

  try {
    const order = req.body || {};
    
    // 🔥 해결책: 확실히 유효한 기본 이메일 사용
    const draftOrder = {
      draft_order: {
        line_items: [{
          title: order.product_title || '테스트 상품',
          price: "1000",
          quantity: 1,
          properties: [
            { name: "주문ID", value: order.order_id || 'TEST' }
          ]
        }],
        customer: {
          email: 'noreply@shopify.com',  // Shopify 공식 이메일 사용
          first_name: '테스트 고객'
        },
        note: `테스트 주문 ${Date.now()}`,
        email: false
      }
    };

    console.log('공식 이메일 사용 Draft Order:', JSON.stringify(draftOrder));

    const response = await fetch(
      `https://${process.env.SHOP_URL}/admin/api/2024-04/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.ADMIN_TOKEN
        },
        body: JSON.stringify(draftOrder)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log('Shopify 오류:', error);
      return res.status(500).json({ 
        success: false, 
        error: `API 오류 (${response.status})`,
        details: error,
        sent_data: draftOrder
      });
    }

    const result = await response.json();
    
    return res.json({
      success: true,
      draft_order_id: result.draft_order.id,
      order_number: result.draft_order.name,
      message: 'Shopify 공식 이메일로 성공!'
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
