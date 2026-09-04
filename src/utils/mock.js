export const nutritionCombos = [
  {
    id: 'vision',
    title: '名目亮睛搭配推荐',
    subtitle: '适合久看屏幕、容易疲劳的人群',
    tags: ['护眼', '花青素', '抗疲劳'],
    products: ['大麦幼青粉', '有机野生蓝莓', '黑豆浆粉', '黑加仑葡萄干'],
    reason: '补充花青素与优质植物营养，帮助缓解高频用眼场景的日常营养压力。',
  },
  {
    id: 'growth',
    title: '身高助长搭配推荐',
    subtitle: '适合处于成长阶段、饮食结构待优化的人群',
    tags: ['成长', '谷物', '蛋白'],
    products: ['有机玉米粥', '黑豆浆粉', '小麦胚芽', '芝麻花生碎'],
    reason: '强化谷物、豆类与坚果组合，补足成长阶段所需的基础营养摄入。',
  },
  {
    id: 'overtime',
    title: '熬夜加班搭配推荐',
    subtitle: '适合工作节奏快、作息不规律的人群',
    tags: ['熬夜', '代谢', '轻负担'],
    products: ['大麦幼青粉', '藏血麦片', '小麦胚芽', '冻干黄桃'],
    reason: '偏轻负担与高纤维组合，适合忙碌工作人群快速补充日常所需。',
  },
];

export const recommendationQuestions = [
  {
    key: 'age',
    title: '1、您的年龄范围',
    options: ['儿童', '青年', '中年', '老年'],
  },
  {
    key: 'gender',
    title: '2、您的性别',
    options: ['女士', '先生'],
  },
  {
    key: 'taste',
    title: '3、您的口味偏好',
    options: ['清淡', '喜欢甜口', '偏酸爽', '都可以'],
  },
  {
    key: 'lifestyle',
    title: '4、您的生活状态',
    options: ['上班族', '学生党', '宝妈/宝爸', '退休生活'],
  },
  {
    key: 'goal',
    title: '5、当前最关注的营养目标',
    options: ['亮眼护眼', '精力续航', '成长助力', '均衡调理'],
  },
];

export const agreementSections = [
  {
    title: '一、总则',
    content:
      '用户完成注册或登录流程后，即表示已经阅读并接受本协议全部条款，并愿意遵守相关平台规则与适用法律法规。',
  },
  {
    title: '二、账号与隐私',
    content:
      '用户需要妥善保管个人账号信息。平台仅在提供服务、履行法定义务或获得授权的情况下处理和使用相关信息。',
  },
  {
    title: '三、使用规则',
    content:
      '用户不得利用本服务发布违法违规内容，不得从事任何破坏平台安全、侵犯他人权益或扰乱正常秩序的行为。',
  },
  {
    title: '四、服务内容',
    content:
      '平台会持续优化推荐能力、页面内容与服务形式，并保留因升级维护而临时中断部分服务的权利。',
  },
  {
    title: '五、知识产权',
    content:
      '平台展示的页面、文案、图形、音视频与系统能力，除另有说明外，其相关权利均归平台或合法权利人所有。',
  },
];

export function getComboByAnswers(answers = {}) {
  if (answers.goal === '亮眼护眼') return nutritionCombos[0];
  if (answers.goal === '成长助力' || answers.age === '儿童') return nutritionCombos[1];
  if (answers.goal === '精力续航' || answers.lifestyle === '上班族') return nutritionCombos[2];
  return nutritionCombos[0];
}

export function buildRecommendation(answers = {}) {
  const primary = getComboByAnswers(answers);
  const alternates = nutritionCombos.filter((item) => item.id !== primary.id).slice(0, 2);

  return {
    summary: `已根据${answers.age || '当前'}阶段、${answers.gender || '个人'}画像与${answers.goal || '均衡调理'}目标生成营养建议`,
    prompt: `请问我${answers.age || '青年'}、${answers.gender || '女士'}、${answers.taste || '都可以'}、${answers.lifestyle || '上班族'}，更适合补充哪些营养组合？`,
    primary,
    alternates,
  };
}
