## 16-1 实现 Noop Renderer

`react-noop-renderer` 和 `react-dom` 都是 `React` 提供的渲染器，用于将 `React` 组件渲染到不同的环境中。

`react-dom` 主要用于在浏览器环境中渲染 `React` 组件，它提供了一系列方法来将组件挂载到 `DOM` 上，并处理事件、更新等相关操作；

而 `react-noop-renderer` 则主要用于在非浏览器环境中进行测试和调试，它不依赖于真实的 `DOM`，也不真正操作 `DOM`，而是提供了一种模拟的渲染环境，可以在 `Node.js` 等环境中进行渲染和测试 `React` 组件，这对于编写单元测试、集成测试以及服务器端渲染等场景非常有用。

---

`react-noop-renderer` 包和 `react-dom` 包很像，我们可以直接拷贝一份 `react-dom` 包，然后对其中涉及 `DOM` 操作的部分进行修改即可。

### 16-1-1 修改 hostConfig.ts

对于 `hostConfig` 来说，要做以下更改：

- 修改 `Instance`、`TextInstance` 和 `Container` 的数据结构，模拟元素节点、文本节点、根容器的相应字段；
- 维护 `instanceCounter` 计数器，来为每个实例分配唯一的 id；
- 调整 `appendInitialChild` 和 `appendChildToContainer` 等方法，将 `DOM` 操作改造成数组的 `splice` 、 `push` 等操作；

```ts
// weak-react\packages\react-noop-renderer\src\hostConfig.ts

import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';

export interface Container {
	rootID: number;
	children: (Instance | TextInstance)[];
}

export interface Instance {
	id: number;
	type: string;
	children: (Instance | TextInstance)[];
	parent: number;
	props: Props;
}

export interface TextInstance {
	text: string;
	id: number;
	parent: number;
}

let instanceCounter = 0;

export const createInstance = (type: string, props: Props): Instance => {
	const instance = {
		id: instanceCounter++,
		type,
		children: [],
		parent: -1,
		props
	};
	return instance;
};

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
	const prevParentID = child.parent;
	const parentID = 'rootID' in parent ? parent.rootID : parent.id;

	if (prevParentID !== -1 && prevParentID !== parentID) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parentID;
	parent.children.push(child);
};

export const createTextInstance = (content: string) => {
	const instance = {
		text: content,
		id: instanceCounter++,
		parent: -1
	};
	return instance;
};

export const appendChildToContainer = (child: Instance, parent: Container) => {
	const prevParentID = child.parent;

	if (prevParentID !== -1 && prevParentID !== parent.rootID) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parent.rootID;
	parent.children.push(child);
};

export function insertChildToContainer(child: Instance, container: Container, before: Instance) {
	const beforeIndex = container.children.indexOf(before);
	if (beforeIndex === -1) {
		throw new Error('before节点不存在');
	}
	const index = container.children.indexOf(child);
	if (index !== -1) {
		container.children.splice(index, 1);
	}
	container.children.splice(beforeIndex, 0, child);
}

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			const text = fiber.memoizedProps?.content;
			return commitTextUpdate(fiber.stateNode, text);
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber);
			}
			break;
	}
}

export const commitTextUpdate = (textInstance: TextInstance, content: string) => {
	textInstance.text = content;
};

export const removeChild = (child: Instance | TextInstance, container: Container) => {
	const index = container.children.indexOf(child);
	if (index === -1) {
		throw new Error('child not found');
	}
	container.children.splice(index, 1);
};

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
		: setTimeout;
```

### 16-1-2 修改 root.ts

在 `root.ts` 中实现创建根容器、更新根容器等功能，还额外实现了 `getChildren` 和 `getChildrenAsJSX` 两个方法，用于获取根容器的子节点及将子节点转换为 JSX：

- **createRoot 函数：**

  - `createRoot` 函数用于创建一个 `React` 根容器管理器。
  - 在 `createRoot` 函数内部，首先创建一个 `container` 对象，包含一个 `rootID` 和一个空的 `children` 数组。然后通过 `createContainer` 函数创建一个 `Fiber` 树的根节点，并将 `container` 对象作为根节点的实例。

- **render 方法：**

  - `render` 方法用于渲染 `React` 元素到根容器上，调用 `updateContainer` 函数进行更新操作。

- **getChildren 方法：**

  - `getChildren` 方法用于获取指定容器或实例的子节点。
  - 如果传入的参数存在且有子节点，则返回子节点数组，否则返回 `null`。

- **getChildrenAsJSX 方法**：

  - `getChildrenAsJSX` 方法用于将子节点数组转换为 `JSX` 元素。
  - 首先通过 `childToJSX` 函数将子节点数组转换为 `JSX` 元素。如果子节点数组只包含一个子节点，则将其直接返回；如果子节点数组包含多个子节点，则将其包装为一个 `React.Fragment` 元素。
  - 最终返回一个符合 `React` 元素结构的对象。

- **childToJSX 函数：**

  - `childToJSX` 函数用于将子节点对象或文本节点转换为 `JSX` 元素。
  - 如果子节点是文本节点，则直接返回文本内容。
  - 如果子节点是数组，则递归调用 childToJSX 函数处理数组中的每个子节点。
  - 如果子节点是实例对象（代表 React 元素节点），则根据实例的类型、props 和子节点递归构建对应的 JSX 元素。
  - 如果子节点是文本实例对象，则直接返回其文本内容。

- **\_Scheduler：**
  - 将 `Scheduler` 导入并暴露给根容器管理器，使其在 `React` 中可以使用调度器来控制更新的优先级和时间。

```ts
// weak-react\packages\react-noop-renderer\src\root.ts

import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler';
import { Container, Instance } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import * as Scheduler from 'scheduler';

let idCounter = 0;
export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: []
	};
	// @ts-ignore
	const root = createContainer(container);

	function getChildren(parent: Container | Instance) {
		if (parent) {
			return parent.children;
		}
		return null;
	}

	function getChildrenAsJSX(root: Container) {
		const children = childToJSX(getChildren(root));
		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: REACT_FRAGMENT_TYPE,
				key: null,
				ref: null,
				props: { children },
				__mark: 'erxiao'
			};
		}
		return children;
	}

	function childToJSX(child: any): any {
		// 文本节点
		if (typeof child === 'string' || typeof child === 'number') {
			return child;
		}

		// 数组
		if (Array.isArray(child)) {
			if (child.length === 0) return null;
			if (child.length === 1) return childToJSX(child[0]);
			const children = child.map(childToJSX);

			if (children.every(child => typeof child === 'string' || typeof child === 'number')) {
				return children.join('');
			}
			return children;
		}

		// Instance
		if (Array.isArray(child.children)) {
			const instance: Instance = child;
			const children = childToJSX(instance.children);
			const props = instance.props;

			if (children !== null) {
				props.children = children;
			}

			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				props,
				__mark: 'erxiao'
			};
		}

		// TextInstance
		return child.text;
	}

	return {
		_Scheduler: Scheduler,
		render(element: ReactElementType) {
			return updateContainer(element, root);
		},
		getChildren() {
			return getChildren(container);
		},
		getChildrenAsJSX() {
			return getChildrenAsJSX(container);
		}
	};
}
```

### 16-1-3 Noop-Renderer 执行示例

对于如下的组件，经由 `Noop-Renderer` 渲染后得到的树状结构如下（对标 `DOM` 树）：

```tsx
// jsx
import React from 'react';
import ReactNoop from 'react-noop-renderer';

function Child() {
	return 'I am child';
}
function App() {
	return (
		<div>
			<Child />
			<div>hello world</div>
		</div>
	);
}
const root = ReactNoop.createRoot();
root.render(<App />);

// getChildren()
root.getChildren();

[
	{
		id: 7,
		parent: 1,
		children: [
			{ text: 'I am child', id: 4, parent: 7 },
			{
				children: [{ text: 'hello world', id: 5, parent: 6 }],
				id: 6,
				parent: 7,
				type: 'div'
			}
		],
		type: 'div'
	}
];

// getChildrenAsJSX()
root.getChildrenAsJSX();

{
	$$typeof: Symbol(react.element),
	key: null,
	props: {
		children: [
			'I am child',
			{
				$$typeof: Symbol(react.element),
				key: null,
				props: { children: 'hello world' },
				ref: null,
				type: 'div',
				__mark: 'erxiao'
			}
		]
	},
	ref: null,
	type: 'div',
	__mark: 'erxiao'
};
```

## 16-2 打包 Noop Renderer

`react-noop-renderer` 包的打包流程和 `react-dom` 包类似，新建 `weak-react\scripts\rollup\react-noop-renderer.config.js` 文件：

```js
// weak-react\scripts\rollup\react-noop-renderer.config.js

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSON('react-noop-renderer');
// react-noop-renderer 包的路径
const pkgPath = resolvePkgPath(name);
// react-noop-renderer 包的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react-noop-renderer
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'ReactNoopRenderer',
				format: 'umd'
			}
		],
		external: [...Object.keys(peerDependencies), 'scheduler'],
		plugins: [
			...getBaseRollupPlugins({
				typescript: {
					exclude: ['./packages/react-dom/**/*'],
					tsconfigOverride: {
						compilerOptions: {
							paths: {
								hostConfig: [`./${name}/src/hostConfig.ts`]
							}
						}
					}
				}
			}),
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

并在 `dev.config.js` 中加入 `reactNoopRendererConfig`，统一打包：

```js
// weak-react\scripts\rollup\dev.config.js

import reactConfig from './react.config';
import reactDomConfig from './react-dom.config';
import reactNoopRendererConfig from './react-noop-renderer.config';

export default () => {
	return [...reactConfig, ...reactDomConfig, ...reactNoopRendererConfig];
};
```

现在运行 `pnpm build-dev` 就可以在 `dist` 文件中看到打包出来的 `react-noop-renderer`。<br/>![](/md_images/weak-react/weak16.1.png)

## 16-3 测试 useEffect

为了完善 `Reconciler` 的测试环境，支持异步操作和并发情况的测试，我们先安装一个并发的测试上下文环境：

```bash
cd weak-react
pnpm i -D -w jest-react
```

再安装 `matchers`，在 `weak-react\scripts\jest` 文件夹中新增以下三个文件：

- `reactTestMatchers.js` 文件：

```js
'use strict';

const JestReact = require('jest-react');
const SchedulerMatchers = require('./schedulerTestMatchers');

function captureAssertion(fn) {
	// Trick to use a Jest matcher inside another Jest matcher. `fn` contains an
	// assertion; if it throws, we capture the error and return it, so the stack
	// trace presented to the user points to the original assertion in the
	// test file.
	try {
		fn();
	} catch (error) {
		return {
			pass: false,
			message: () => error.message
		};
	}
	return { pass: true };
}

function assertYieldsWereCleared(Scheduler) {
	const actualYields = Scheduler.unstable_clearYields();
	if (actualYields.length !== 0) {
		throw new Error(
			'Log of yielded values is not empty. ' + 'Call expect(Scheduler).toHaveYielded(...) first.'
		);
	}
}

function toMatchRenderedOutput(ReactNoop, expectedJSX) {
	if (typeof ReactNoop.getChildrenAsJSX === 'function') {
		const Scheduler = ReactNoop._Scheduler;
		assertYieldsWereCleared(Scheduler);
		return captureAssertion(() => {
			expect(ReactNoop.getChildrenAsJSX()).toEqual(expectedJSX);
		});
	}
	return JestReact.unstable_toMatchRenderedOutput(ReactNoop, expectedJSX);
}

module.exports = {
	...SchedulerMatchers,
	toMatchRenderedOutput
};
```

- `schedulerTestMatchers.js` 文件：

```js
'use strict';

function captureAssertion(fn) {
	// Trick to use a Jest matcher inside another Jest matcher. `fn` contains an
	// assertion; if it throws, we capture the error and return it, so the stack
	// trace presented to the user points to the original assertion in the
	// test file.
	try {
		fn();
	} catch (error) {
		return {
			pass: false,
			message: () => error.message
		};
	}
	return { pass: true };
}

function assertYieldsWereCleared(Scheduler) {
	const actualYields = Scheduler.unstable_clearYields();
	if (actualYields.length !== 0) {
		throw new Error(
			'Log of yielded values is not empty. ' + 'Call expect(Scheduler).toHaveYielded(...) first.'
		);
	}
}

function toFlushAndYield(Scheduler, expectedYields) {
	assertYieldsWereCleared(Scheduler);
	Scheduler.unstable_flushAllWithoutAsserting();
	const actualYields = Scheduler.unstable_clearYields();
	return captureAssertion(() => {
		expect(actualYields).toEqual(expectedYields);
	});
}

function toFlushAndYieldThrough(Scheduler, expectedYields) {
	assertYieldsWereCleared(Scheduler);
	Scheduler.unstable_flushNumberOfYields(expectedYields.length);
	const actualYields = Scheduler.unstable_clearYields();
	return captureAssertion(() => {
		expect(actualYields).toEqual(expectedYields);
	});
}

function toFlushUntilNextPaint(Scheduler, expectedYields) {
	assertYieldsWereCleared(Scheduler);
	Scheduler.unstable_flushUntilNextPaint();
	const actualYields = Scheduler.unstable_clearYields();
	return captureAssertion(() => {
		expect(actualYields).toEqual(expectedYields);
	});
}

function toFlushWithoutYielding(Scheduler) {
	return toFlushAndYield(Scheduler, []);
}

function toFlushExpired(Scheduler, expectedYields) {
	assertYieldsWereCleared(Scheduler);
	Scheduler.unstable_flushExpired();
	const actualYields = Scheduler.unstable_clearYields();
	return captureAssertion(() => {
		expect(actualYields).toEqual(expectedYields);
	});
}

function toHaveYielded(Scheduler, expectedYields) {
	return captureAssertion(() => {
		const actualYields = Scheduler.unstable_clearYields();
		expect(actualYields).toEqual(expectedYields);
	});
}

function toFlushAndThrow(Scheduler, ...rest) {
	assertYieldsWereCleared(Scheduler);
	return captureAssertion(() => {
		expect(() => {
			Scheduler.unstable_flushAllWithoutAsserting();
		}).toThrow(...rest);
	});
}

module.exports = {
	toFlushAndYield,
	toFlushAndYieldThrough,
	toFlushUntilNextPaint,
	toFlushWithoutYielding,
	toFlushExpired,
	toHaveYielded,
	toFlushAndThrow
};
```

- `setupJest.js` 文件：

```js
expect.extend({
	...require('./reactTestMatchers')
});
```

---

再修改一下 `jest` 的配置文件 `jest.config.js`，新增以下配置：

```js
// weak-react\scripts\jest\jest.config.cjs

module.exports = {
	// ...

	// 测试文件的匹配规则
	moduleNameMapper: {
		'^scheduler$': '<rootDir>/node_modules/scheduler/unstable_mock.js'
	},
	// 这个对象用于配置Jest的虚拟时钟（fake timers）
	fakeTimers: {
		enableGlobally: true,
		legacyFakeTimers: true
	},
	// 用于指定在测试环境设置之后运行的文件
	setupFilesAfterEnv: ['./scripts/jest/setupJest.js']
};
```

现在就可以运行测试用例了，在` react-reconciler` 包中新增 `src\_\_tests\_\_` 文件夹，用来放测试用例，然后新增测试用例 `ReactEffectOrdering-test.js`：

```js
// weak-react\packages\react-reconciler\src\__tests__\ReactEffectOrdering-test.js

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-func-assign */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let useEffect;

describe('ReactHooksWithNoopRenderer', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.useFakeTimers();

		React = require('react');
		act = require('jest-react').act;
		Scheduler = require('scheduler');
		ReactNoop = require('react-noop-renderer');

		useEffect = React.useEffect;
	});

	test('passive unmounts on deletion are fired in parent -> child order', async () => {
		const root = ReactNoop.createRoot();

		function Parent() {
			useEffect(() => {
				return () => Scheduler.unstable_yieldValue('Unmount parent');
			});
			return <Child />;
		}

		function Child() {
			useEffect(() => {
				return () => Scheduler.unstable_yieldValue('Unmount child');
			});
			return 'Child';
		}

		await act(async () => {
			root.render(<Parent />);
		});

		expect(root).toMatchRenderedOutput('Child');
		await act(async () => {
			root.render(null);
		});
		expect(Scheduler).toHaveYielded(['Unmount parent', 'Unmount child']);
	});
});
```

现在执行 `pnpm test` 就可以对 `useEffect` 进行测试了。

```bash
cd weak-react
pnpm test
```

<br/>![](/md_images/weak-react/weak16.2.png)<br/>
（如果测试用例没有通过，则可能是部分文件写的有问题，尤其注意一些对 flag 的处理，可以和本次提交涉及的一些更改文件对比检查一下。）

---

相关代码可在 `git tag weak-react-v1.16` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.16
