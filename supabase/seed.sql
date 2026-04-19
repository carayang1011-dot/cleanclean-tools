-- =============================================
-- 種子資料：渠道清單與常用尺寸
-- =============================================

INSERT INTO channels (name, slug, sort_order, default_sizes) VALUES

('官網活動', 'website-activity', 1, '[
  {"name":"首頁大BN","size":"1920x540"},
  {"name":"首頁小BN","size":"1200x400"},
  {"name":"活動頁BN","size":"1200x628"},
  {"name":"活動方BN","size":"1200x1200"},
  {"name":"商品主圖","size":"800x800"}
]'),

('門市旗艦店', 'flagship-store', 2, '[
  {"name":"門市立牌","size":"600x900"},
  {"name":"A4 DM","size":"210x297mm"},
  {"name":"海報 A3","size":"297x420mm"},
  {"name":"貼紙方形","size":"100x100mm"},
  {"name":"提袋印刷","size":"依版型"}
]'),

('百貨-快閃櫃', 'department-popup', 3, '[
  {"name":"快閃背板","size":"120x240cm"},
  {"name":"桌上型立牌","size":"A4"},
  {"name":"DM 折頁","size":"A5"},
  {"name":"價格牌","size":"依版型"}
]'),

('百貨館內宣傳輸出', 'department-instore', 4, '[
  {"name":"燈箱輸出","size":"依實際尺寸"},
  {"name":"柱體貼紙","size":"依實際尺寸"},
  {"name":"地貼","size":"依實際尺寸"},
  {"name":"掛旗","size":"依版型"}
]'),

('蝦皮活動需求', 'shopee', 5, '[
  {"name":"商品主圖","size":"800x800"},
  {"name":"活動BN","size":"1200x400"},
  {"name":"商品描述圖","size":"800x800"},
  {"name":"蝦皮官方活動圖","size":"800x800<1MB"}
]'),

('MO店+活動需求', 'mo-store', 6, '[
  {"name":"商品主圖","size":"800x800"},
  {"name":"首頁BN","size":"1200x400"},
  {"name":"活動方形圖","size":"1080x1080"}
]'),

('LINE@專區', 'line-at', 7, '[
  {"name":"LINE 推播圖","size":"1040x1040"},
  {"name":"LINE 橫幅","size":"1040x530"},
  {"name":"LINE 圖文選單","size":"2500x1686"},
  {"name":"LINE 點數卡","size":"960x480"},
  {"name":"LINE OA 封面","size":"1080x878"}
]'),

('FB廣告圖文', 'fb-ads', 8, '[
  {"name":"FB 動態廣告","size":"1080x1080"},
  {"name":"FB 橫幅廣告","size":"1200x628"},
  {"name":"IG 限動廣告","size":"1080x1920"},
  {"name":"FB 輪播圖","size":"1080x1080"}
]'),

('團購', 'group-buy', 9, '[
  {"name":"開團主視覺","size":"1080x1080"},
  {"name":"FB/LINE推播","size":"1080x1080"},
  {"name":"產品情境圖","size":"1080x1080"},
  {"name":"成效報告截圖","size":"依版型"}
]'),

('粉專需求', 'facebook-page', 10, '[
  {"name":"FB貼文方形","size":"1080x1080"},
  {"name":"FB貼文橫幅","size":"1200x628"},
  {"name":"IG 貼文","size":"1080x1080"},
  {"name":"IG 限時動態","size":"1080x1920"},
  {"name":"FB 封面","size":"820x312"}
]'),

('CRM需求', 'crm', 11, '[
  {"name":"EDM 主圖","size":"600x400"},
  {"name":"EDM Banner","size":"600x200"},
  {"name":"推播圖","size":"1040x1040"},
  {"name":"簡訊配圖","size":"600x315"}
]'),

('CRM-VIP需求', 'crm-vip', 12, '[
  {"name":"VIP EDM 主圖","size":"600x400"},
  {"name":"VIP 推播圖","size":"1040x1040"},
  {"name":"VIP 專屬卡面","size":"依版型"},
  {"name":"VIP 禮盒設計","size":"依版型"}
]'),

('戶外廣告', 'outdoor-ads', 13, '[
  {"name":"捷運燈箱","size":"依實際尺寸"},
  {"name":"候車亭廣告","size":"依實際尺寸"},
  {"name":"看板廣告","size":"依實際尺寸"},
  {"name":"電梯廣告","size":"依實際尺寸"}
]'),

('異業合作', 'cross-industry', 14, '[
  {"name":"合作主視覺","size":"1080x1080"},
  {"name":"聯名貼紙","size":"依版型"},
  {"name":"合作EDM","size":"600x400"},
  {"name":"合作DM","size":"A5"}
]'),

('經銷需求', 'distributor', 15, '[
  {"name":"經銷商DM","size":"A5"},
  {"name":"POP立牌","size":"A4"},
  {"name":"貨架貼紙","size":"依版型"},
  {"name":"產品型錄","size":"A4"}
]')

ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  sort_order    = EXCLUDED.sort_order,
  default_sizes = EXCLUDED.default_sizes;
