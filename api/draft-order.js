// 완전 안정화된 Draft Order API
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST만 허용됩니다' });
  }

  try {
    // 환경변수 검증
    const shopUrl = process.env.SHOP_URL;
    const adminToken = process.env.ADMIN_TOKEN;
    
    if (!shopUrl) {
      return res.status(500).json({ 
        success: false, 
        error: 'SHOP_URL 환경변수가 없습니다',
        debug: 'Environment variable missing'
      });
    }
    
    if (!adminToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'ADMIN_TOKEN 환경변수가 없습니다',
        debug: 'Admin token missing'
      });
    }

    const order = req.body || {};
    
    // 최소한의 Draft Order 데이터
    const draftOrder = {
      draft_order: {
        line_items: [{
          title: order.product_title || '커스텀 주문',
          price: "1000",
          quantity: 1
        }],
        customer: {
          email: order.customer_info?.email || 'test@example.com'
        },
        note: `테스트 주문: ${order.order_id || 'TEST'}`,
        email: false
      }
    };

    // 안전한 fetch 호출
    const shopifyResponse = await fetch(
      `https://${shopUrl}/admin/api/2024-04/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken
        },
        body: JSON.stringify(draftOrder)
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      
      return res.status(500).json({ 
        success: false, 
        error: `Shopify API 오류 (${shopifyResponse.status})`,
        shopify_error: errorText,
        debug: {
          status: shopifyResponse.status,
          shop_url: shopUrl,
          token_length: adminToken.length
        }
      });
    }

    const result = await shopifyResponse.json();
    
    return res.json({
      success: true,
      draft_order_id: result.draft_order.id,
      order_number: result.draft_order.name,
      debug: 'Draft Order 생성 성공'
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: `서버 내부 오류: ${error.message}`,
      debug: {
        error_name: error.name,
        error_stack: error.stack?.substring(0, 200)
      }
    });
  }
}
