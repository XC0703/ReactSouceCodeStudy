# 1、React 源码调试环境搭建

## 1-1 项目初始化

1. 新增`react-debugger`并添加必要的依赖包：

   ```bash
   mkdir react-debugger

   cd react-debugger

   yarn init

   yarn add vite @vitejs/plugin-react -D
   ```

2. 然后添加以下目录或文件：<br/>![debugger1.1.png](/md_images/react-debugger/debugger1.1.png)

3. 然后直接下载[React v18.2.0 源码](https://github.com/facebook/react/tree/v18.2.0)压缩包或执行以下命令下载：

   ```bash
   # 克隆整个仓库
   git clone https://github.com/facebook/react.git

   # 切换到v18.2.0的分支
   git checkout v18.2.0
   ```

   **注意**：直接下载或克隆的[React 源码](https://github.com/facebook/react)中，`packages`目录下会有一个其它历史版本源码不存在的包`react-dom-bindings`，这主要是因为当前的源码是最新的（截止`2024.5.1`为`v19.0.0`的版本，具体版本可在源码根目录下的`ReactVersions.js`文件中查看）。该目录主要用于当前版本可能包含的一些新的内部实现，以支持 React 的新特性和 API。

   其中需要的包如下：

   ```js
   // react
   // react-dom
   // react-reconciler
   // scheduler
   // shared
   ```

   最后将这些包复制到我们项目下的`react-debugger\src\react\packages`目录中，以便后续进行调试。<br/>
   同时可以删除各个包下面的`__tests__`目录、`__mocks__`目录、`test-utils`目录以及`README.md`文件，这些内容是调试时无需使用到的，可以直接去除。

## 1-2 项目运行配置

1. 首先在我们的`react-debugger\package.json`文件中配置`vite`命令，用于打包我们的项目并启动：

   ```json
   // react-debugger\package.json
   {
   	"name": "react-debugger",
   	"version": "1.0.0",
   	"type": "module",
   	"license": "ISC",
   	"description": "本项目是一个 React 调试器，用于调试 React 的源码",
   	"scripts": {
   		"dev": "vite"
   	},
   	"devDependencies": {
   		"@vitejs/plugin-react": "^4.2.1",
   		"vite": "^5.2.11"
   	}
   }
   ```

2. 然后去配置我们的`react-debugger\vite.config.js`文件：

   ```js
   // react-debugger\vite.config.js
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import path from 'path';

   // https://vitejs.dev/config/
   export default defineConfig({
   	plugins: [react()],
   	// 添加一些全局环境变量，防止运行时报错：xxx is not defined
   	define: {
   		__DEV__: true,
   		__PROFILE__: true,
   		__UMD__: true,
   		__EXPERIMENTAL__: true
   	},
   	// 将相关包的路径重定向
   	resolve: {
   		alias: {
   			react: path.posix.resolve('src/react/packages/react'),
   			'react-dom': path.posix.resolve('src/react/packages/react-dom'),
   			'react-reconciler': path.posix.resolve('src/react/packages/react-reconciler'),
   			scheduler: path.posix.resolve('src/react/packages/scheduler'),
   			shared: path.posix.resolve('src/react/packages/shared')
   		}
   	}
   });
   ```

3. 在`react-debugger\index.html`文件中将`main.jsx`文件引入：
   ```html
   <!-- react-debugger\index.html -->
   <!DOCTYPE html>
   <html lang="en">
   	<head>
   		<meta charset="UTF-8" />
   		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
   		<title>react-debugger</title>
   	</head>
   	<body>
   		<div id="root"></div>
   		<script type="module" src="src/main.jsx"></script>
   	</body>
   </html>
   ```
4. 然后便可以执行以下命令运行项目：

   ```bash
   cd react-debugger

   yarn dev
   ```

## 1-3 问题解决

运行项目后可以看到页面控制台报错，这是因为我们`react-debugger\src\react\packages`里面的包是直接从源码中复制粘贴进来的，还需要进一步加工处理才能使用。

### 1-3-1 flow 类型问题

![debugger1.2.png](/md_images/react-debugger/debugger1.2.png)<br/>这个报错是因为`React`默认使用`Flow`进行类型检测，但变量添加的类型注释不是`JS`的标准语法，只能在开发阶段使用，还需进行编译移除类型注释才能正确运行`JS`代码。我们可以使用插件进行类型检查的移除。

```bash
cd react-debugger

yarn add flow-remove-types -D
```

```bash
# 使用方法:
yarn flow-remove-types source -d target
# 例如以下命令将 react-debugger/src/react/packages 目录下的文件类型都去除
yarn flow-remove-types --out-dir src/react src/react/packages
```

执行该命令后可以看到效果：<br/>![debugger1.3.png](/md_images/react-debugger/debugger1.3.png)

此时去`react-debugger\src\react\packages`下面查看发现大部分包文件的类型都被移除了。（用完可以执行`yarn remove flow-remove-types`命令清除该依赖）。

如果此时重新执行`yarn dev`命令后依然有文件因为类型检查报错，则需要到相应文件里面手动去除类型并重新执行`yarn dev`命令：<br/>![debugger1.4.png](/md_images/react-debugger/debugger1.4.png)

> `Flow`是一个由`Facebook`出品的`JavaScript`静态类型检查工具，它与`Typescript`不同的是，它可以部分引入，不需要完全重构整个项目（需要进行类型检查的文件加上`//@flow`注释），所以对于一个已有一定规模的项目来说，迁移成本更小，也更加可行。除此之外，`Flow`可以提供实时增量的反馈，通过运行`Flow server`不需要在每次更改项目的时候完全从头运行类型检查，提高运行效率。

### 1-3-2 默认导出问题

重新执行`yarn dev`命令后，发现新的报错：
![debugger1.5.png](/md_images/react-debugger/debugger1.5.png)
此时去到`react-debugger\src\react\packages\react-dom\client.js`文件里面查看发现该文件确实没有`default`导出，所以报错。</br>
同时由于`react-debugger\src\react\packages\react\index.js`文件也没有`default`导出，也会导致同样类型的报错：
![debugger1.6.png](/md_images/react-debugger/debugger1.6.png)

我们去修改`react-debugger\src\main.jsx`文件中的导入使用，避免这两个报错：

```jsx
// react-debugger\src\main.jsx
// 修改前：
import React from 'react';
import ReactDOM from 'react-dom/client';
ReactDOM.createRoot();

// 修改后：
import * as React from 'react';
import { createRoot } from 'react-dom/client';
createRoot();
```

### 1-3-3 其它报错解决

**问题一：**![debugger1.7.png](/md_images/react-debugger/debugger1.7.png)
来到`react-debugger\src\react\packages\react-reconciler\src\ReactFiberHostConfig.js`文件，作出如下修改：

```js
// react-debugger\src\react\packages\react-reconciler\src\ReactFiberHostConfig.js
// 修改前：
throw new Error('This module must be shimmed by a specific renderer.');

// 修改后：
export * from './forks/ReactFiberHostConfig.dom';
```

**问题二：**

![debugger1.8.png](/md_images/react-debugger/debugger1.8.png)
来到`react-debugger\src\react\packages\shared\ReactSharedInternals.js`文件，作出如下修改：

```js
// react-debugger\src\react\packages\shared\ReactSharedInternals.js
// 修改前：
const ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// 修改后：
import ReactSharedInternals from '../react/src/ReactSharedInternals';
```

**问题三：**
来到`react-debugger\src\react\packages\react\src\ReactServerContext.js`文件，作出如下修改：

```js
// react-debugger\src\react\packages\react\src\ReactServerContext.js
// 修改前：
const ContextRegistry = ReactSharedInternals.ContextRegistry;

// 修改后：
const ContextRegistry = ReactSharedInternals?.ContextRegistry;
```

## 1-4 jsconfig.json 文件配置

新增`react-debugger\jsconfig.json`文件：

```json
// react-debugger\jsconfig.json
{
	"compilerOptions": {
		"baseUrl": "./",
		"paths": {
			"react/*": ["src/react/packages/react/*"],
			"react-dom/*": ["src/react/packages/react-dom/*"],
			"react-dom-bindings/*": ["src/react/packages/react-dom-bindings/*"],
			"react-reconciler/*": ["src/react/packages/react-reconciler/*"],
			"scheduler/*": ["src/react/packages/scheduler/*"],
			"shared/*": ["src/react/packages/shared/*"]
		}
	},
	"exclude": ["node_modules", "dist"]
}
```

`jsconfig.json` 目录中存在文件表明该目录是 `JavaScript` 项目的根目录。该 `jsconfig.json` 文件指定了 `JavaScript` 语言服务提供的功能的根文件和选项。**可以让我们在 VSCode 编辑器中实现代码路径的点击跳转，并且可以自动提示**。

## 1-5 launch.json 文件配置

`launch.json` 文件是 VSCode 中用于配置调试选项的文件。</br>
我们可以点击左侧的`运行和调试`里面的快捷键在根目录下生成一个模版文件`.vscode\launch.json`，并将端口改成我们需要的`5173`，运行的根目录改为我们需要的`"${workspaceFolder}/react-debugger"`：
![debugger1.9.png](/md_images/react-debugger/debugger1.9.png)

```json
{
	"version": "1.0.0",
	"configurations": [
		{
			"type": "msedge",
			"request": "launch",
			"name": "针对 localhost 启动 Edge",
			"url": "http://localhost:5173",
			"webRoot": "${workspaceFolder}/react-debugger"
		}
	]
}
```

此时`yarn dev`运行`react-debugger`项目之后，再去左侧的`运行和调试`里面的`调试`选项，选择`针对 localhost 启动 Edge`，就可以看到效果了：
![debugger1.10.gif](/md_images/react-debugger/debugger1.10.gif)

---

最后，参照上面步骤搭建另一个项目`react-debugger-handwriting`用于源码调试过程中用代码复现核心逻辑，区别就是`react-debugger-handwriting\src\react\packages`里面置空，留给我们手动实现（直接复制一份然后改个名称并删除所有的`react\packages`包即可）。

自此，我们的`React`源码调试环境搭建完毕，到这里的代码请看分支[react-debugger-environment](https://github.com/XC0703/ReactSouceCodeStudy/tree/react-debugger-environment)，直接用本人配置好的即可，无需重新进行配置。
