# 多语言国际化 (i18n)

YaoList 使用 `i18next` 和 `react-i18next` 实现多语言支持。

## 使用方法

### 在组件中使用

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('menu.dashboard')}</h1>
      <button>{t('common.save')}</button>
    </div>
  )
}
```

### 切换语言

```tsx
import { useTranslation } from 'react-i18next'

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }
  
  return (
    <button onClick={() => changeLanguage('en-US')}>
      English
    </button>
  )
}
```

## 添加新语言

1. 在 `locales/` 目录下创建新的语言文件，如 `ja-JP.json`
2. 复制 `zh-CN.json` 的结构
3. 翻译所有文本
4. 在 `i18n/index.ts` 中导入并注册

```ts
import jaJP from './locales/ja-JP.json'

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
    'ja-JP': { translation: jaJP },  // 新增
  },
  // ...
})
```

## 添加新翻译键

在所有语言文件中添加相同的键：

```json
// zh-CN.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "功能描述"
  }
}

// en-US.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}
```

## 翻译文件结构

```
i18n/
├── index.ts              # i18n配置
├── locales/              # 语言文件
│   ├── zh-CN.json        # 简体中文
│   ├── en-US.json        # 英语
│   └── ...               # 其他语言
└── README.md             # 使用文档
```

## 命名规范

- 使用驼峰命名法
- 按功能模块分组
- 键名要语义化

```json
{
  "moduleName": {
    "actionName": "文本",
    "elementName": "文本"
  }
}
```

## 开发者贡献翻译

开源开发者只需要：
1. 复制 `zh-CN.json` 文件
2. 重命名为目标语言代码（如 `fr-FR.json`）
3. 翻译所有值（保持键不变）
4. 提交PR

无需修改任何 `.tsx` 文件！
