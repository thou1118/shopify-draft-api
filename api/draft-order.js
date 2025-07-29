// Shopify Draft Order 생성 API
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용' });
  }

  try {
    const order = req.body;
    
    // Shopify Draft Order 데이터
    const draftOrder = {
      draft_order: {
        line_items: [{
          title: order.product_title || '커스텀 주문',
          price: order.total_amount || 0,
          quantity: 1,
          properties: [
            { name: "주문ID", value: order.order_id || '' },
            { name: "선택옵션", value: order.selected_options?.order_summary || '없음' },
            { name: "파일", value: order.uploaded_files?.files ? `${order.uploaded_files.files.length}개` : '없음' }
          ]
        }],
        customer: {
          email: order.customer_info?.email || '',
          first_name: order.customer_info?.recipient_name || '고객'
        },
        shipping_address: {
          address1: order.customer_info?.address || '',
          zip: order.customer_info?.postal_code || '',
          country: 'JP'
        },
        note: `주문ID: ${order.order_id}`,
        email: true
      }
    };

    // Shopify API 호출
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
      return res.status(500).json({ success: false, error: `Shopify Error: ${error}` });
    }

    const result = await response.json();
    
    return res.json({
      success: true,
      draft_order_id: result.draft_order.id,
      order_number: result.draft_order.name
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
