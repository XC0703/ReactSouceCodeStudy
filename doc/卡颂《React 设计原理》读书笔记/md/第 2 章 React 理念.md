# 第 2 章 React 理念

## 2.1 问题与解决思路

我们日常使用 App、浏览网页时，有两类场景会制约“快速响应”：

- 当执行大计算量的操作或者设备性能不足时，页面掉帧，导致卡顿，概括为 CPU 的瓶颈。“执行 JS”与渲染流水线同为宏任务，如果 JS 执行时间过长，导致渲染流水线绘制图片的速度跟不上屏幕刷新频率，就会造成页面掉帧，表现为页面卡顿。
- 进行 I/O 操作后，需要等待数据返回才能继续操作，等待的过程不能快速响应，概括为 I/O 的瓶颈。

在 React 中，最有可能造成 CPU 瓶颈的部分是“VDOM 相关工作”，即”运行时代码执行流程“。Svelte、Vue3 的方向是“利用 AOT 在编译时减少运行时代码流程。React 作为“重运行时”框架选择在“运行时”寻求解决方案，具体做法是：将 VDOM 的执行过程拆分为一个个独立的宏任务，将每个宏任务的执行时间限制在一定范围内（初始为 5ms）。这样做的结果是一个“会造成掉帧的长任务”被拆解成多个“不会造成掉帧的短宏任务”，以减少掉帧的可能性，这一技术被称为 `Time Slice（时间切片）`。

React 将人机交互的研究成果整合到 UI 中，用于解决 IO 瓶颈（用户对于“鼠标悬停”、“文本框输入”等操作更易感知卡顿）：</br>

- 为不同的操作造成的“自变量变化”赋予不同优先级——用于调度优先级的调度器；</br>
- 所有优先级统一调度，优先处理“最高优先级的更新”——用于调度器的调度算法；</br>
- 如果更新正在进行（即进入 VDOM 相关工作），有“更高优先级的更新”产生，则会中断当前更新，优先处理高优先级更新——支持可中断的 VDOM 实现。</br>

> 当上一个短宏任务完成后，下一个短宏任务开始前，正是检查“是否应该中断”的时机。所以，不管是从“解决 CPU 的瓶颈”还是“解决 IO 的瓶颈”角度出发，底层诉求都是：实现`Time Slice`。

## 2.2 底层架构的演进

React 15 架构可以分为两部分：

- Reconciler（协调器）——VDOM 的实现，负责根据自变量变化计算出 UI 变化。（mountComponent 和 updateComponent 这两个方法都会递归更新子组件，更新流程一旦开始，中途无法中断）
- Renderer（渲染器）——负责将 UI 变化渲染到宿主环境中。

React16 重构了架构：

- Scheduler（调度器）——调度任务的优先级，高优先级任务优先进入 Reconciler,内存中进行。
- Reconciler（协调器）——VDOM 的实现，负责根据自变量变化计算出 UI 变化,内存中进行。
- Renderer（渲染器）——负责将 UI 变化渲染到宿主环境中。

1.  在新架构中，Reconciler 中的更新流程从递归变成了“可中断的循环过程”。每次循环都会调用 shouldYield 判断当前 Time Slice 是否有剩余时间，没有剩余时间则暂停更新流程，将主线程交给渲染流水线，等待下一个宏任务再继续执行。</br>
2.  当 Scheduler 将调度后的任务交给 Reconciler 后，Reconciler 最终会为 VDOM 元素标记各种副作用 flags（比如更新元素、插入/移动元素、删除元素）。</br>
3.  Renderer 根据“Reconciler 为 VDOM 元素标记的各种 flags”执行对应操作。</br>

画图示例如下：<br/>![](/md_images/书中的流程图/2-4.png)
旧架构是同步的，新架构是异步、并发的。

React 团队的渐进升级策略——开发者仍可以在默认情况下使用同步更新，在使用并发特性后再开启并发更新，比如：

- useDeferredValue
- useTransition
- 示例代码如下：

  ```jsx
  const App = () => {
  	const [count, updateCount] = useState(0);
  	const [isPending, startTransition] = useTransition();

  	const onClick = () => {
  		// 使用了并发特性 useTransition
  		startTransition(() => {
  			// 本次更新是并发更新
  			updateCount(count => count + 1);
  		});
  	};
  	return <h3 onClick={onClick}>{count}</h3>;
  };
  ```

## 2.3 Fiber 架构

### 2.3.1 FiberNode 的含义

React 中有三种节点类型：</br>

- React Element（React 元素），即 createElement 方法的返回值；</br>
- React Component（React 组件），开发者可以在 React 中定义函数、类两种类型的 Component;</br>
- FiberNode，组成 Fiber 架构的节点类型。</br>

三者的关系如下：

```jsx
// App 是 React Component
const App = () => {
	return <h3>Hello</h3>;
};
// ele 是 React Element
const ele = <App />;

// 在 React 运行时内部，包含 App 对应 FiberNode
React.createRoot(rootNode).render(ele);
```

FiberNode 包含以下三层含义：</br>
（1）作为架构，v15 的 Reconciler 采用递归的方式执行，被称为 Stack Reconciler。v16 及以后版本的 Reconciler 基于 FiberNode 实现，被称为 Fiber Reconciler。</br>
（2）作为"静态的数据结构"，每个 FiberNode 对应一个 React 元素，用于保存 React 元素的类型、对应的 DOM 元素等信息。</br>
（3）作为"动态的工作单元"，每个 FiberNode 用于保存"本次更新中该 React 元素变化的数据、要执行的工作（增、删、改、更新 Ref、副作用等）"。</br>

- 作为一个构造函数，Fiber 中包含很多属性，我们按照上述三层含义来拆分这些属性：

```jsx
// FiberNode 构造函数
function FiberNode(tag, pendingProps, key, mode) {
	this.tag = tag;
	this.key = key;
	this.elementType = null;
	// 省略其它属性，所有属性都以 this.xxx 的形式定义
}
```

- 作为架构，Fiber 架构是由多个 FiberNode 组成的树状结构，FiberNode 之间由如下属性连接：

```jsx
// 指向父 FiberNode
this.return = null;
// 指向第一个子 FiberNode
this.child = null;
// 指向右边的兄弟 FiberNode
this.sibling = null;
```

举例说明，对于如下组件，对应的 Fiber Tree 示例如下图所示：（由于 React 内部的优化路径，“只有唯一文本节点”的 FiberNode 不会生成独立 FiberNode，因此图中没有 span 的子 FiberNode）

```jsx
function App() {
	return (
		<div>
			Hello
			<span>Wordld</span>
		</div>
	);
}
```

![](/md_images/书中的流程图/2-7.png)

### 2.3.2 双缓存机制

当我们用`canvas`绘制动画，每一帧绘制前都会调用`ctx.clearRect`清除上一帧的画面。如果当前帧画面计算量比较大，导致清除上一帧画面到绘制当前帧画面之间有较长间隙，就会出现白屏闪烁。

为了解决这个问题，我们可以在内存中绘制当前帧动画，绘制完毕后直接用当前帧替换上一帧画面，由于省去了两帧替换间的计算时间，不会出现从白屏到出现画面的闪烁情况。

这种**在内存中构建并直接替换**的技术叫做[双缓存](https://baike.baidu.com/item/%E5%8F%8C%E7%BC%93%E5%86%B2)。

`React`使用“双缓存”来完成`Fiber树`的构建与替换——对应着`DOM树`的创建与更新。

在`React`中最多会同时存在两棵`Fiber树`。当前屏幕上显示内容对应的`Fiber树`称为`current Fiber树`，正在内存中构建的`Fiber树`称为`workInProgress Fiber树`。

`current Fiber树`中的`Fiber节点`被称为`current fiber`，`workInProgress Fiber树`中的`Fiber节点`被称为`workInProgress fiber`，他们通过`alternate`属性连接。

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

### 2.3.3 mount 时 Fiber Tree 的创建

考虑如下例子：

```jsx
function App() {
	const [num, add] = useState(0);
	return <p onClick={() => add(num + 1)}>{num}</p>;
}

const rootElement = document.getElementById('root');
ReactDOM.createRoot(rootElement).render(<App />);
```

- `HostRoot` 代表“应用在宿主环境挂载的根节点”，在上面这个示例为`rootElement`。</br>

- `HostRootFiber` 代表`HostRoot`对应的`FiberNode`。</br>

- `FiberRootFiber` （在整个应用首次渲染时创建，一个页面可以创建多个应用）负责管理该应用的全局事宜，比如：</br>

  - `Current Fiber Tree` 与 `Wip Fiber Tree`之间的切换；
  - 应用中任务的过期时间；
  - 应用的任务调度信息。

- 执行`ReactDOM.createRoot`会创建下图所示的结构：（`FiberRootFiber.current`指向`Current Fiber Tree`的根节点，当前仅有一个`HostRootFiber`，对应“首屏渲染时仅有根节点的空白页面”）</br>

  ```html
  <!-- “首屏渲染时仅有根节点的空白页面” -->
  <body>
  	<div id="root"></div>
  </body>
  ```

  <br/>![](/md_images/书中的流程图/2-8.png)

- `mount`流程会基于每个`React`元素以“以`DFS`的顺序”依次生成`wip fiberNode`(生成的过程中会复用`Current Fiber Tree`中的同级节点)，并连接起来构成`Wip Fiber Tree`，如下图所示：<br/>![](/md_images/书中的流程图/2-9.png)

* 当`wip fiberNode`生成完毕后，`FiberRootFiber`会被传递给 Renderer，根据过程中标记的“副作用有关 flags”执行对应操作。

* 当`Renderer`完成工作后，代表"`Wip Fiber Tree` 对应的 UI"已经渲染到宿主环境中，此时`FiberRootNode.current` 指向 `Wip HostRootFiber`，完成双缓存的切换工作，曾经的 `Wip Fiber Tree`变为`Current Fiber Tree`，如下图所示：<br/>![](/md_images/书中的流程图/2-10.png)

### 2.3.4 update 时 Fiber Tree 的创建

点击上述示例中的 P 元素，触发更新，这一操作会开启`update`流程，生成一棵新的`Wip Fiber Tree`，如下图所示：<br/>![](/md_images/书中的流程图/2-11.png)![](/md_images/书中的流程图/2-12.png)
