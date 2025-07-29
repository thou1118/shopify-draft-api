// 고객 먼저 생성 후 Draft Order 생성 방식
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST만 허용' });

  try {
    const order = req.body || {};
    
    // 🎯 1단계: 먼저 고객 생성 (이메일 검증 우회)
    console.log('1단계: 고객 생성 시작');
    
    const customerData = {
      customer: {
        first_name: '테스트',
        last_name: '고객',
        email: `customer${Date.now()}@shopifypartners.com`,  // 파트너 도메인 사용
        verified_email: true,
        accepts_marketing: false
      }
    };

    const customerResponse = await fetch(
      `https://${process.env.SHOP_URL}/admin/api/2024-04/customers.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.ADMIN_TOKEN
        },
        body: JSON.stringify(customerData)
      }
    );

    let customerId = null;
    
    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      customerId = customerResult.customer.id;
      console.log('고객 생성 성공:', customerId);
    } else {
      console.log('고객 생성 실패, 고객 없이 진행');
    }

    // 🎯 2단계: Draft Order 생성 (고객 ID 사용)
    console.log('2단계: Draft Order 생성 시작');
    
    const draftOrder = {
      draft_order: {
        line_items: [{
          title: order.product_title || '테스트 상품',
          price: "1000",
          quantity: 1,
          properties: [
            { name: "주문ID", value: order.order_id || 'TEST' },
            { name: "테스트", value: '고객 생성 방식' }
          ]
        }],
        ...(customerId && { customer: { id: customerId } }),  // 고객 ID가 있을 때만 추가
        note: `고객 생성 방식 테스트: ${Date.now()}`,
        email: false
      }
    };

    console.log('생성할 Draft Order:', JSON.stringify(draftOrder, null, 2));

    const draftResponse = await fetch(
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

    if (!draftResponse.ok) {
      const error = await draftResponse.text();
      console.log('Draft Order 생성 실패:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Draft Order 생성 실패 (${draftResponse.status})`,
        details: error,
        customer_created: !!customerId
      });
    }

    const result = await draftResponse.json();
    
    return res.json({
      success: true,
      draft_order_id: result.draft_order.id,
      order_number: result.draft_order.name,
      customer_id: customerId,
      message: '고객 생성 방식으로 성공!'
    });

  } catch (error) {
    console.log('전체 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
