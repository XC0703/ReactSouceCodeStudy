## 2-1 源码目录结构

[React 源码](https://github.com/facebook/react)使用的是 `Monorepo` 结构管理各个包，源码中主要包括如下部分：

- fixtures：测试用例
- packages：主要部分，包含 scheduler，reconciler 等
- scripts：react 构建相关

其中，主要的包在 packages 目录下，主要包含以下模块：

- react：核心 Api 所在，如 React.createElement、React.Component
- react-reconclier：协调器，react 的核心逻辑所在，在 render 阶段用来构建 fiber 节点，宿主环境无关
- scheduler：调度器相关
- react-server: ssr 相关
- react-fetch: 请求相关
- react-interactions: 和事件如点击事件相关
- 各种宿主环境的包：
  - react-dom：浏览器环境
  - react-native-renderer：原生环境
  - react-art：canvas & svg 渲染
  - react-noop-renderer：调试或 fiber 用
- 辅助包：
  - shared：公用辅助方法，宿主环境无关
  - react-is : 判断类型
  - react-client: 流相关
  - react-fetch: 数据请求相关
  - react-refresh: 热加载相关

现在实现 react 包中的 `createElement` 和 `jsx` 方法，并实现 react 包的打包流程。

## 2-2 实现 JSX 方法

在 React 中使用 JSX 语法描述用户界面，JSX 语法就是一种语法糖，是 一种 JavaScript 语法扩展，它允许开发者在 JavaScript 代码中直接编写类似 HTML 的代码，并在运行时将其转换为 React 元素。

JSX 转换就是将 JSX 源代码变成浏览器可以理解的 JavaScript 代码的过程，以下面的代码为例：

```jsx
// JSX 源代码
import React from 'react';

function App() {
	return <h1>Hello World</h1>;
}
```

```jsx
// React 17之前，JSX 转换结果
import React from 'react';

function App() {
	return React.createElement('div', null, 'Hello world!');
}

// React 17之后，JSX 转换结果
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
	return _jsx('div', { children: 'Hello world!' });
}
```

这两个转化结果区别可见博客：https://developer.aliyun.com/article/1130017

JSX 转换的过程大致分为两步：

编译时：由 Babel 编译实现，Babel 会将 JSX 语法转换为标准的 JavaScript API；
运行时：由 React 实现，jsx 方法 和 React.createElement 方法；
因此，我们只需要实现运行时的部分即可，即 `jsx` 方法和 `React.createElement` 方法，包括 dev 和 prod 两个环境。

我们先在 `packages` 文件夹下新建 `react` 文件夹，进入到这个文件夹下，执行 `pnpm init`：

```bash
cd weak-react\packages\react
pnpm init
```

初始化的 `package.json` 文件如下所示：

```json
// weak-react\packages\react\package.json

{
	"name": "react",
	"version": "1.0.0",
	"description": "",
	"main": "index.js",
	"scripts": {
		"test": "echo \"Error: no test specified\" && exit 1"
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

其中 `main` 字段代表了 `react` 包的入口文件，`main` 对应的是 `CommonJS` 规范，由于我们的项目是使用 `rollup` 打包的，`rollup` 是原生支持 `esModule` 的，`esModule` 规范中对应 `main` 的字段为 `module`，所以我们将入口改为：`"module": "index.ts"`；然后，删除 `scripts` 字段，在 `description` `字段中增加包描述，dependencies` 字段指明了包的依赖，此时的 `package.json` 文件如下所示：

```json
// weak-react\packages\react\package.json

{
	"name": "react",
	"version": "1.0.0",
	"description": "react common functions",
	"module": "index.ts",
	"dependencies": {
		"shared": "workspace:*"
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

在 `react` 包下新建一个 `src` 目录，在 `src` 目录下新建一个 `jsx.ts` 文件。

执行 `jsx` 方法和 `React.createElement` 方法的返回结果是一种被称为 `ReactElement` 的数据结构，所以我们首先要定义一下 `ReactElement` 的构造函数：

```ts
// weak-react\packages\react\src\jsx.ts

import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Type, Ref, Key, Props, ReactElementType, ElementType } from 'shared/ReactTypes';

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props): ReactElementType {
	const element = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props,
		__mark: 'weak-react'
	};
	return element;
};
```

其中 `$$typeof` 是一个内部使用的字段，通过这个字段来指明当前这个数据结构是一个`ReactElement`，`_mark` 字段是为了与官方 `react` 包做区分的一个自定义字段。

我们将所有的类型定义和公共方法都放在一个公用的 `shared` 包中。在 `packages` 文件夹下新建 `shared` 文件夹，进入到这个文件夹下，执行 `pnpm init`。

`shared` 包不需要入口文件，因为它里面的所有方法都会直接在其他包里面被引用，代码如下：

```json
// weak-react\packages\shared\package.json

{
	"name": "shared",
	"version": "1.0.0",
	"description": "shared hepler functions and symbols",
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

```ts
// weak-react\packages\shared\ReactSymbols.ts

const supportSymbol = typeof Symbol === 'function' && Symbol.for;

// 表示普通的 React 元素，即通过 JSX 创建的组件或 DOM 元素
export const REACT_ELEMENT_TYPE = supportSymbol ? Symbol.for('react.element') : 0xeac7;
```

```ts
// weak-react\packages\shared\ReactTypes.ts

// packages/shared/ReactTypes.ts
export type Type = any;
export type Key = any;
export type Props = any;
export type Ref = any;
export type ElementType = any;

export interface ReactElementType {
	$$typeof: symbol | number;
	key: Key;
	props: Props;
	ref: Ref;
	type: ElementType;
	__mark: string;
}
```

接着实现 `jsx` 方法：

```jsx
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
	return _jsx('div', { children: 'Hello world!' });
}
```

从以上示例可以看出， `jsx` 方法接收两个参数，第一个参数 `type` 为组件的 `type`，第二个参数是其他配置，可能有第三个参数为组件的 `children`，返回一个 `ReactElement` 数据结构。

```ts
// weak-react\packages\react\src\jsx.ts
// ...之前的代码

export const jsx = (type: ElementType, config: any, ...children: any) => {
	let key: Key = null;
	let ref: Ref = null;
	const props: Props = {};
	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val;
		}
	}
	const childrenLength = children.length;
	if (childrenLength) {
		if (childrenLength === 1) {
			props.children = children[0];
		} else {
			props.children = children;
		}
	}
	return ReactElement(type, key, ref, props);
};
```

这就是完整的 `jsx` 方法的实现。

为了区分生产环境和开发环境，这里再定义一个 `jsxDEV` 方法，唯一的区别是，开发环境不处理 `children` 参数，方便多做一些额外的检查：

```ts
// weak-react\packages\react\src\jsx.ts
// ...之前的代码

export const jsxDEV = (type: ElementType, config: any) => {
	let key: Key = null;
	let ref: Ref = null;
	const props: Props = {};
	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val;
		}
	}
	return ReactElement(type, key, ref, props);
};
```

新增 `index.ts` 文件，这个文件是 `react` 包的入口，导出一个对象，包含版本号 `version` 和 `React.createElement` 方法。其中，`React.createElement` 方法就是刚才实现的 `jsx` 方法。

```ts
// weak-react\packages\react\index.ts

import { jsx } from './src/jsx';
export default {
	version: '1.0.0',
	createElement: jsx
};
```

至此，我们已经实现了 `jsx` 方法和 `React.createElement` 方法，并支持了 `dev` 和 `prod` 两个环境，接下来实现打包流程。

## 2-3 实现打包流程

根据上面的示例，我们实现了 `jsx` 方法、`jsxDEV` 方法和 `React.createElement` 方法，需要将打包到对应的文件中：

- react/jsx-runtime.js
- react/jsx-dev-runtime.js
- react/index.js

我们的打包脚本都在 `weak-react\scripts\rollup` 目录下，新增一个 `weak-react\scripts\rollup\react.config.js` 文件，里面是 `react` 包的打包配置，再新增一个 `weak-react\scripts\rollup\utils.js` 文件，里面是一些公用的方法。

需要先安装几个包：

```bash
cd weak-react
pnpm i rollup-plugin-generate-package-json rollup-plugin-typescript2 @rollup/plugin-commonjs rimraf -D -w
```

其中：

- `rollup-plugin-generate-package-json`：用于生成 `package.json` 文件。
- `rollup-plugin-typescript2`：用于编译 Typescript。
- `@rollup/plugin-commonjs`：用于将 CommonJS 模块转换为 ES 模块，以便在 Rollup 中进行打包。CommonJS 是一种用于在浏览器之外执行 JavaScript 代码的模块规范，而 Rollup 默认只支持 ES 模块。
- `rimraf`：用于删除之前的打包产物

`react.config.js` 导出一个数组，数组中的第一个对象即为 `react\index.ts` 的配置，定义一下输入文件和输出文件，然后配置插件和 `package.json`；数组中的第二个对象为 `react/jsx-runtime.js` 和 `react/jsx-dev-runtime.js` 的配置。

```js
// weak-react\scripts\rollup\react.config.js

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const { name, module } = getPackageJSON('react');
// react 包的路径
const pkgPath = resolvePkgPath(name);
// react 包的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: {
			file: `${pkgDistPath}/index.js`,
			name: 'React',
			format: 'umd'
		},
		plugins: [
			// 这个函数的用途是提供一个基础的插件集合，包含 ES6 语法转换、TS语法转换等
			...getBaseRollupPlugins(),
			// 生成 package.json 的插件
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js'
				})
			})
		]
	},
	// jsx-runtime
	{
		input: `${pkgPath}/src/jsx.ts`,
		output: [
			// jsx-runtime
			{
				file: `${pkgDistPath}/jsx-runtime.js`,
				name: 'jsx-runtime',
				format: 'umd'
			},
			// jsx-dev-runtime
			{
				file: `${pkgDistPath}/jsx-dev-runtime.js`,
				name: 'jsx-dev-runtime',
				format: 'umd'
			}
		],
		plugins: getBaseRollupPlugins()
	}
];
```

```js
// weak-react\scripts\rollup\utils.js

import path from 'path';
import fs from 'fs';
import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';

const pkgPath = path.resolve(__dirname, '../../packages');
const distPath = path.resolve(__dirname, '../../dist/node_modules');
export function resolvePkgPath(pkgName, isDist) {
	if (isDist) {
		return `${distPath}/${pkgName}`;
	}
	return `${pkgPath}/${pkgName}`;
}
export function getPackageJSON(pkgName) {
	const path = `${resolvePkgPath(pkgName)}/package.json`;
	const str = fs.readFileSync(path, { encoding: 'utf-8' });
	return JSON.parse(str);
}
export function getBaseRollupPlugins({ typescript = {} } = {}) {
	return [cjs(), ts(typescript)];
}
```

现在我们到根目录下的 `package.json` 文件中新增一个 `scripts` 命令：

```json
// weak-react\package.json

// ...
  "scripts": {
    "lint": "eslint --ext .ts,.jsx,.tsx --fix --quiet ./packages",
    "build-dev": "rimraf dist && rollup --config scripts/rollup/react.config.js --bundleConfigAsCjs"
  },
// ...
```

运行 `npm run build-dev`，可以看到，根目录下的 `dist/node_modules/react` 文件夹中出现了 `react` 包的打包产物：

- index.js
- jsx-dev-runtime.js
- jsx-runtime.js
- package.json

## 2-4 调试打包结果

### 2-4-1 npm link

`react` 包打包完之后，我们可以使用 `npm link` 来调试以下打包结果，流程如下所示：

1. 首先我们在 `weak-react` 项目中，生成了一个 `react` 包的打包产物，即 `dist/node_modules/react` 文件夹中的内容。
2. 然后进入到 `dist/node_modules/react` 目录下，通过` pnpm link --global` 命令，就将全局 `node_modules` 下的 `react` 指向了我们刚刚生成的 `react` 包。
3. 接着，用 `create-react-app` 创建一个新的 `Demo` 项目，在这个 `Demo` 项目中，再执行 `pnpm link react --global` 命令，就能将 `Demo` 项目中依赖的 `react` 从这个项目的 `node_modules/react` 变成全局 `node_modules` 下的 `react`。

4. 这样我们就能通过 `Demo` 项目直接调用我们刚刚生成的 `react` 包了。

这种方式的优点是：可以模拟实际项目引用 `React` 的情况；缺点是：不支持热更新，每次更新 `my-react` 项目之后都需要重新打包，并在 `Demo` 项目中重新执行 `npm run dev`，比较繁琐。

### 2-4-2 vite

如果想支持热更新调试，可以使用 [Vite](https://cn.vitejs.dev/guide/)。

在 `weak-react` 根目录下新建一个 `weak-react\demos` 目录，然后新增 `weak-react\demos\test-1\index.html` 文件与 `weak-react\demos\test-1\main.tsx` 文件。

```html
<!-- weak-react\demos\test-1\index.html -->

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" type="image/svg+xml" href="/vite.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>weak-react</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="main.tsx"></script>
	</body>
</html>
```

```tsx
// weak-react\demos\test-1\main.tsx

import React from 'react';

console.log(React);
console.log(React.createElement('div', null, 'Hello world!'));
```

在 `weak-react\package.json` 中增加 `scripts` 指令 ` "demo": "vite serve demos/test-1 --config scripts/vite/vite.config.js --force"`，并安装以下依赖：

```bash
cd weak-react
pnpm i @rollup/plugin-replace @types/react @types/react-dom @vitejs/plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh vite -D -w
```

其中：

- `@rollup/plugin-replace`：这是一个 `Rollup` 插件，用于在构建过程中替换特定的模块或者变量。
- `@types/react`：用于类型检查。
- `@types/react-dom`：用于类型检查。
- `@vitejs/plugin-react`：用于支持 React。
- `eslint-plugin-react-hooks`：用于检查 React Hooks 的使用。
- `eslint-plugin-react-refresh`：用于支持 React 的热更新。
- `vite`：用于开发环境。

新建 `weak-react\scripts\vite\vite.config.js` 文件：

```js
// weak-react\scripts\vite\vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import { resolvePkgPath } from '../rollup/utils';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	// replace 插件用于定义全局变量 __DEV__ 并将其设置为 true，同时 preventAssignment 选项防止了对这个变量的重新赋值。
	plugins: [react(), replace({ __DEV__: true, preventAssignment: true })],
	resolve: {
		// 包路径重定向
		alias: [
			{
				find: 'react',
				replacement: resolvePkgPath('react')
			},
			{
				find: 'react-dom',
				replacement: resolvePkgPath('react-dom')
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(resolvePkgPath('react-dom'), './src/hostConfig.ts')
			}
		]
	}
});
```

最后，新增 `weak-react\packages\react\jsx-dev-runtime.ts` 文件（在 `React 17` 中引入了新的 `JSX` 转换，这个文件是用来支持这个新转换的。新的转换不会将 `JSX` 转换为 `React.createElement`，而是直接从 `React` 的包中引入新的入口函数并调用。目前新增该文件只是为了契合源码的结构，还没有进行相应使用。）

```ts
// weak-react\packages\react\jsx-dev-runtime.ts

export { jsxDEV } from './src/jsx';
```

这样只需执行 `npm run demo` 即可实时调试代码，实现热更新。

可以看到 `weak-react\demos\test-1\main.tsx` 的打印结果如下：

![](/md_images/weak-react/weak2.1.png)

---

至此，我们就完成了 `JSX` 方法的开发、打包、调试。

相关代码可在 `git tag weak-react-v1.2` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.2
