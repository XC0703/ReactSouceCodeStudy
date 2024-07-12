## 7-1 实现 react-dom 包

React 是一个跨平台的库，可以用于构建 Web 应用、移动应用（React Native）等。react-dom 就是 React 在 Web 环境中的渲染实现，用于将 React 组件渲染到实际的 DOM 上，并提供了一些与 DOM 操作相关的功能。

之前我们在 `react-reconciler/src/hostConfig.ts` 中模拟实现了一些生成、插入 DOM 元素的函数，现在就在 `react-dom` 中真正实现它。

先新建 `weak-react\packages\react-dom` 目录，再进行初始化：

```bash
pnpm init
```

初始化的 `package.json` 文件如下所示：

```json
// weak-react\packages\react-dom\package.json

{
	"name": "react-dom",
	"version": "1.0.0",
	"description": "",
	"module": "index.ts",
	"dependencies": {
		"shared": "workspace: *",
		"react-reconciler": "workspace: *"
	},
	"peerDependencies": {
		"react": "workspace: *"
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

新建 `weak-react\packages\react-dom\src\hostConfig.ts` 文件，复制 `weak-react\packages\react-reconciler\src\hostConfig.ts` 中的内容过来并将该文件删除：

```ts
// weak-react\packages\react-dom\src\hostConfig.ts

export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string, porps: any): Instance => {
	// TODO: 处理 props
	const element = document.createElement(type);
	return element;
};

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	const element = document.createTextNode(content);
	return element;
};

export const appendChildToContainer = (child: Instance, parent: Instance | Container) => {
	parent.appendChild(child);
};
```

同时记得将 `weak-react\tsconfig.json` 文件中的 `hostConfig.ts` 路径修改，防止报错：

```json
// weak-react\tsconfig.json

{
	// ...
	"compilerOptions": {
		// ...
		"paths": {
			"hostConfig": ["./react-dom/src/hostConfig.ts"]
		}
	}
}
```

接着实现 `weak-react\packages\react-dom\src\root.ts`，先来实现 `ReactDOM.createRoot().render()` 方法，我们[之前](./4、实现更新机制.md)讲过，这个函数过程中会调用两个 API：

- **createContainer 函数**: 用于创建一个新的容器（`container`），该容器包含了 `React` 应用的根节点以及与之相关的一些配置信息。`createContainer` 函数会创建一个新的 `FiberRootNode` 对象，该对象用于管理整个 `React` 应用的状态和更新。
- **updateContainer 函数**: 用于更新已经存在的容器中的内容。在内部，`updateContainer` 函数会调用 `scheduleUpdateOnFiber` 等方法，通过 `Fiber` 架构中的协调更新过程，将新的 `React` 元素（`element`）渲染到容器中，并更新整个应用的状态。

这两个 API 在 `react-reconciler` 包里面已经实现了，直接调用即可。

```ts
// weak-react\packages\react-dom\src\root.ts

import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler';
import { Container } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';

// 实现 ReactDOM.createRoot(root).render(<App />);
export function createRoot(container: Container) {
	const root = createContainer(container);
	return {
		render(element: ReactElementType) {
			updateContainer(element, root);
		}
	};
}
```

新建 `weak-react\packages\react-dom\index.ts`文件，将 `ReactDOM` 导出：

```ts
// weak-react\packages\react-dom\index.ts

import * as ReactDOM from './src/root';

export default ReactDOM;
```

现在我们已经实现了 React 首屏渲染的更新流程，即：

通过 `ReactDOM.createRoot(root).render(<App />)` 方法，创建 React 应用的根节点，将一个 `Placement` 加入到更新队列中，并触发了首屏渲染的更新流程：在对 Fiber 树进行深度优先遍历（DFS）的过程中，比较新旧节点，生成更新计划，执行 DOM 操作，最终将 `<App />` 渲染到根节点上。

目前我们还只实现了首屏渲染触发更新，还有很多触发更新的方式，如类组件的 `this.setState()`、函数组件的 `useState`、`useEffect`等 ，将在后面实现。

## 7-2 实现打包流程

接着来实现 `react-dom` 包的打包流程，具体过程参考 [第 2 节](./2、实现%20JSX.md)，需要注意两点：

- 需要安装一个包来处理 `hostConfig` 的导入路径：

  ```bash
  cd weak-react
  pnpm i -D -w @rollup/plugin-alias
  ```

- `ReactDOM = Reconciler + hostConfig`，不要将 `react` 包打包进 `react-dom` 里，否则会出现数据共享冲突。

`weak-react\scripts\rollup\react-dom.config.js` 的具体配置如下：

```js
// weak-react\scripts\rollup\react-dom.config.js

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSON('react-dom');
// react-dom 包的路径
const pkgPath = resolvePkgPath(name);
// react-dom 包的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react-dom
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'ReactDOM',
				format: 'umd'
			},
			{
				file: `${pkgDistPath}/client.js`,
				name: 'client',
				format: 'umd'
			}
		],
		external: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugins(),
			// webpack resolve alias
			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						react: version
					},
					main: 'index.js'
				})
			})
		]
	}
];
```

最后，为了在执行 `npm run build-dev` 时能同时将 `react` 和 `react-dom` 都打包，我们新建一个 `weak-react\scripts\rollup\dev.config.js` 文件，将 `react.config.js` 和 `react-dom.config.js` 统一导出。

```js
// weak-react\scripts\rollup\dev.config.js

import reactDomConfig from './react-dom.config';
import reactConfig from './react.config';

export default [...reactConfig, ...reactDomConfig];
```

同时修改根目录下的 `package.json` 文件下的 `scripts` 命令：

```json
// weak-react\package.json

// ...
  "scripts": {
    "build-dev": "rimraf dist && rollup --config scripts/rollup/dev.config.js --bundleConfigAsCjs",
  },
// ...
```

现在运行 `npm run build-dev` 就可以得到 `react` 和 `react-dom` 的打包产物了：<br/>![](/md_images/weak-react/weak7.1.png)

通过 `pnpm lint --global` （`npm link`调试）或者 `npm run demo` （`vite`调试）可在测试项目中运行你自己开发的 `react` 包和 `react-dom` 包。此时我们采用 `vite` 调试的方式，先将 `weak-react\demos\test-1\main.tsx` 内容进行相应修改：

```tsx
// weak-react\demos\test-1\main.tsx

/**
 * 调试 react-dom 包
 */
import React from 'react';
import ReactDOM from 'react-dom/client'; // weak-react\scripts\vite\vite.config.js 中，重定向的应该是'react-dom/client'而不是'react-dom'，方便类型推断

// 1、创建一个 React 组件，从 jsx 语法到 React 元素虚拟DOM，分为两步，第一步是 编译时（babel实现），第二步是运行时（手动实现）。
// const App = () => {
// 	return <div>Hello world!</div>;
// };
// 经过编译转换为下面这行代码：
const App = React.createElement('div', null, 'Hello world!');
// 最终转化为虚拟DOM
console.log('生成的React元素虚拟DOM', App);

// 2、获取 DOM 容器
const container = document.getElementById('root') as HTMLElement; //  HTMLElement | null，需要转换为 HTMLElement

// 3、使用 ReactDOM.createRoot 创建根实例，类似于 Vue 中的 createApp
const root = ReactDOM.createRoot(container);

// 4、使用 root.render 方法渲染组件（虚拟DOM变成真实DOM）,类似于 Vue 中的 mount
root.render(App);
```

此时根目录下运行 `npm run demo` 命令，即可看到效果：<br/>![](/md_images/weak-react/weak7.2.png)

---

至此，我们就实现了基础版的 `react-dom` 包，更多的功能我们将在后面一一实现。

相关代码可在 `git tag weak-react-v1.7` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.7
