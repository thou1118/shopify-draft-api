// 이메일 문제 완전 해결 버전
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
    
    if (!shopUrl || !adminToken) {
      return res.status(500).json({ 
        success: false, 
        error: '환경변수가 설정되지 않았습니다'
      });
    }

    const order = req.body || {};
    
    // 🔥 이메일 문제 해결: customer 객체를 조건부로 생성
    const customerData = {};
    
    // 이름이 있으면 추가
    if (order.customer_info?.recipient_name) {
      customerData.first_name = order.customer_info.recipient_name;
    }
    
    // 이메일이 유효한 경우에만 추가 (강제 추가 제거!)
    const email = order.customer_info?.email;
    if (email && email.includes('@') && email.includes('.') && 
        !email.includes('test') && !email.includes('example')) {
      customerData.email = email;
    }

    // Draft Order 데이터 - 이메일 강제 추가 제거
    const draftOrder = {
      draft_order: {
        line_items: [{
          title: order.product_title || '커스텀 주문',
          price: (order.total_amount || 1000).toString(),
          quantity: 1,
          properties: [
            { name: "주문ID", value: order.order_id || 'TEST' }
          ]
        }],
        // 🎯 핵심: customer 객체가 비어있으면 아예 제거
        ...(Object.keys(customerData).length > 0 && { customer: customerData }),
        note: `테스트 주문: ${order.order_id || 'TEST'}`,
        email: false  // 이메일 발송 비활성화
      }
    };

    console.log('생성할 Draft Order:', JSON.stringify(draftOrder, null, 2));

    // Shopify API 호출
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
        sent_data: draftOrder
      });
    }

    const result = await shopifyResponse.json();
    
    return res.json({
      success: true,
      draft_order_id: result.draft_order.id,
      order_number: result.draft_order.name,
      message: '이메일 없이 Draft Order 생성 성공!'
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: `서버 오류: ${error.message}`
    });
  }
}
