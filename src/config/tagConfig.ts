export interface TagConfigItem {
  tagId: string;
  label: string;
  group: string;
  aliases: string[];
  description: string;
  enabled: boolean;
}

export const tagConfig: TagConfigItem[] = [
  { tagId: 'menstrual-management', label: '经期管理', group: '女性健康类', aliases: ['月经管理', '周期管理'], description: '经期和月经周期相关管理议题。', enabled: true },
  { tagId: 'pms', label: 'PMS', group: '女性健康类', aliases: ['经前综合征'], description: '经前综合征相关讨论。', enabled: true },
  { tagId: 'premenstrual-emotion', label: '经前情绪', group: '女性健康类', aliases: ['经前emo', '经前焦虑'], description: '经前情绪波动和心理状态。', enabled: true },
  { tagId: 'period-pain', label: '痛经', group: '女性健康类', aliases: ['经痛'], description: '痛经及疼痛管理。', enabled: true },
  { tagId: 'intimate-health', label: '私密健康', group: '女性健康类', aliases: ['私处护理', '亲密健康'], description: '私密健康和护理相关内容。', enabled: true },
  { tagId: 'puberty-education', label: '青春期教育', group: '女性健康类', aliases: ['初潮教育'], description: '青春期和初潮教育。', enabled: true },
  { tagId: 'postpartum-care', label: '产后护理', group: '女性健康类', aliases: ['产后恢复'], description: '产后护理相关议题。', enabled: true },
  { tagId: 'menopause', label: '更年期', group: '女性健康类', aliases: ['围绝经期'], description: '更年期健康议题。', enabled: true },
  { tagId: 'pads', label: '卫生巾', group: '产品功能类', aliases: ['卫生巾产品'], description: '卫生巾品类。', enabled: true },
  { tagId: 'night-product', label: '夜用产品', group: '产品功能类', aliases: ['夜用', '夜用卫生巾'], description: '夜用护理产品。', enabled: true },
  { tagId: 'period-pants', label: '安睡裤', group: '产品功能类', aliases: ['安心裤'], description: '裤型经期护理产品。', enabled: true },
  { tagId: 'liquid-pads', label: '液体卫生巾', group: '产品功能类', aliases: ['液体材料卫生巾'], description: '液体卫生巾相关产品。', enabled: true },
  { tagId: 'breathability', label: '透气性', group: '产品功能类', aliases: ['透气'], description: '透气体验和材料表现。', enabled: true },
  { tagId: 'leak-proof', label: '防漏', group: '产品功能类', aliases: ['防漏保护', '不漏'], description: '防漏功能和场景。', enabled: true },
  { tagId: 'comfort', label: '舒适感', group: '产品功能类', aliases: ['舒适'], description: '佩戴舒适体验。', enabled: true },
  { tagId: 'material-innovation', label: '材质创新', group: '产品功能类', aliases: ['新材质'], description: '材料和结构创新。', enabled: true },
  { tagId: 'ugc-co-creation', label: 'UGC共创', group: '内容运营类', aliases: ['用户共创', '共创'], description: '用户共创内容玩法。', enabled: true },
  { tagId: 'ip-character', label: 'IP角色', group: '内容运营类', aliases: ['角色化', '品牌IP'], description: 'IP角色和人格化表达。', enabled: true },
  { tagId: 'comment-interaction', label: '评论区互动', group: '内容运营类', aliases: ['评论互动'], description: '评论区运营玩法。', enabled: true },
  { tagId: 'topic-operation', label: '话题运营', group: '内容运营类', aliases: ['话题玩法'], description: '社媒话题运营。', enabled: true },
  { tagId: 'emotional-value', label: '情绪价值', group: '内容运营类', aliases: ['情绪陪伴', '情绪安抚'], description: '情绪价值和陪伴内容。', enabled: true },
  { tagId: 'science-content', label: '科普内容', group: '内容运营类', aliases: ['健康科普', '科普'], description: '健康教育和科普内容。', enabled: true },
  { tagId: 'moment-marketing', label: '节点营销', group: '内容运营类', aliases: ['节日营销'], description: '节点营销相关内容。', enabled: true },
  { tagId: 'weibo', label: '微博', group: '品牌/平台类', aliases: [], description: '微博平台内容。', enabled: true },
  { tagId: 'xiaohongshu', label: '小红书', group: '品牌/平台类', aliases: ['小红书平台'], description: '小红书平台内容。', enabled: true },
  { tagId: 'douyin', label: '抖音', group: '品牌/平台类', aliases: ['抖音平台'], description: '抖音平台内容。', enabled: true },
  { tagId: 'tiktok-shop', label: 'TikTok Shop', group: '品牌/平台类', aliases: ['TikTok电商'], description: 'TikTok Shop电商场景。', enabled: true },
  { tagId: 'ecommerce-review', label: '电商评价', group: '品牌/平台类', aliases: ['用户评价'], description: '电商评价和反馈。', enabled: true },
  { tagId: 'competitor-case', label: '竞品案例', group: '品牌/平台类', aliases: ['竞品动态'], description: '竞品案例和动作。', enabled: true },
  { tagId: 'endorsement-marketing', label: '代言人营销', group: '品牌/平台类', aliases: ['代言人'], description: '代言人营销动作。', enabled: true },
  { tagId: 'athlete-marketing', label: '运动员营销', group: '品牌/平台类', aliases: ['女性运动员'], description: '运动员和体育营销。', enabled: true },
];
