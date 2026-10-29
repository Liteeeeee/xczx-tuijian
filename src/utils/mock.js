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

export const privacySections = [
  {
    title: '一、我们如何收集信息',
    content:
      '为向您提供营养推荐、账号登录与历史记录查询等服务，我们会收集您主动填写的手机号码、验证码登录凭证，以及在问卷中提交的年龄、性别、口味偏好、生活状态与营养目标等信息。',
  },
  {
    title: '二、我们如何使用信息',
    content:
      '上述信息仅用于生成个性化营养组合建议、保存您的推荐历史、保障账号安全以及改进产品体验。我们不会将您的个人信息用于与上述目的无关的用途。',
  },
  {
    title: '三、信息的存储与保护',
    content:
      '我们会在实现服务目的所必需的期限内保存您的个人信息，并采用加密传输、访问权限控制等安全措施防止信息被未经授权地访问、披露或篡改。',
  },
  {
    title: '四、信息的共享',
    content:
      '我们不会向第三方出售您的个人信息。仅在法律法规要求、司法机关或行政机关依法定程序提出要求，或为完成您主动选择的服务所必需时，才会在必要范围内共享相关信息。',
  },
  {
    title: '五、您的权利',
    content:
      '您可以随时查询、更正或要求删除您的个人信息，也可以注销账号。如需行使上述权利，可通过「我的 - 关于我们」页面与我们联系，我们将在核实身份后及时处理。',
  },
  {
    title: '六、政策更新',
    content:
      '我们可能会适时更新本隐私政策。更新后我们会在小程序内以显著方式提示，若您继续使用本服务，即视为您同意更新后的内容。',
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
