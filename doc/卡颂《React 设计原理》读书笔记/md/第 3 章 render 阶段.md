# 第 3 章 render 阶段

## 3.1 流程概括

根据`Scheduler`调度的结果不同，`render`阶段可能开始于`performSyncWorkOnRoot`（同步更新流程）或`performConcurrentWorkOnRoot`（并发更新流程）方法。但无论哪个流程，都是调用`performUnitOfWork(workInProgress)`，会创建下一个`fiberNode`并赋值给`workInProgress`，并将`workInProgress`与已创建的`fiberNode`连接起来构成`Fiber Tree`。
`performUnitOfWork`分为两部分：递和归。当遍历到叶子元素（不包含子`fiberNode`）时，`performUnitOfWork`就会进入归阶段。

- 递阶段会从`HostRootFiber`开始向下以`DFS`的方式遍历，为“遍历到的每个`fiberNode`”执行`beginWork`方法，该方法会根据传入的`fiberNode`创建下一级`fiberNode`。具体工作为：第一个子`fiberNode`与父`fiberNode`通过`return`连接，子`fiberNode`通过`sibling`依次连接，代码示意：

  ```jsx
  // jsx情况
  <ul>
  	<li></li>
  	<li></li>
  	<li></li>
  </ul>;

  // 子fiberNode通过sibling依次连接
  LI0Fiber.sibling = LI1Fiber;
  LI1Fiber.sibling = LI2Fiber;

  // 第一个子fiberNode与父fiberNode通过return连接
  LI0Fiber.return = ULFiber;
  ```

- 归阶段会调用`completeWork`方法处理`fiberNode`。
- `performUnitOfWork`方法的伪代码如下：

  ```js
  function performUnitOfWork(fiberNode) {
  	// 省略递阶段执行 beginWork 工作
  	if (fiberNode.child) {
  		performUnitOfWork(fiberNode.child);
  	}
  	// 省略归阶段执行 completeWork 工作
  	if (fiberNode.sibling) {
  		performUnitOfWork(fiberNode.sibling);
  	}
  }
  ```

- 对于下面组件，`render`阶段会依次执行：

  ```jsx
  // jsx
  function App() {
  	return (
  		<div>
  			Hello
  			<span>World</span>
  		</div>
  	);
  }

  // render阶段执行
  1、HostRootFiber beginWork（生成App fiberNode）
  2、App fiberNode beginWork（生成DIV fiberNode）
  3、DIV fiberNode beginWork（生成'Hello'、SPAN fiberNode）
  4、'Hello' fiberNode beginWork（叶子元素）
  5、'Hello' fiberNode completeWork
  6、SPAN fiberNode beginWork（叶子元素）
  7、SPAN fiberNode completeWork
  8、DIV fiberNode completeWork
  9、App fiberNode completeWork
  10、HostRootFiber completeWork
  ```

## 3.2 beginWork

`beginWork`的工作流程如图所示：<br/>![](/md_images/书中的流程图/3-1.png)
`reconcile`分为`mount`和`update`两个分支，`mount`时执行`mountChildFibers`方法，`update`时执行`reconcileChildFibers`方法。这两个方法都是`ChildReconciler`方法的返回值：

```js
// 两者的区别只是传参不同
const reconcileChildFibers = ChildReconciler(true);
const mountChildFibers = ChildReconciler(false);

function ChildReconciler(shouldTrackSideEffects) {
	// 省略代码实现
}
```

`shouldTrackSideEffects`代表“是否追踪副作用”，即是否标记`flags`，标记的`flags`主要有几类，主要与元素位置相关：

- 标记`ChildDeletion`，代表删除操作；
- 标记`Placement`，代表插入或移动操作。

给`newFiber`打上`flags`主要依靠**位运算**，可以不仅`flags`，涉及状态、优先级的操作都大量使用了位运算。（位运算借助了枚举，每个枚举值都是一个二进制位掩码（至于为什么用二进制源码表示，这是因为经过大量的实践证明，二进制表示、位运算可以节省内存空间的同时大大优化对比性能，同时也可以方便组合、提高代码简洁度））

## 3.3 completeWork

与`beginWork`类似，`completeWork`也会根据`wip.tag`区分对待，流程大体包括两个步骤：

1. 创建或者标记元素更新；（表示该`fiberNode`在本次更新中的增、删、改操作均已标记完成）
2. flags 冒泡。

### 3.3.1 flags 冒泡

当更新流程经过`Reconciler`后，会得到一棵`Wip Fiber Tree`，其中部分`fiberNode`被标记`flags`。而`flags`冒泡主要用于高效找到这些散落在`Wip Fiber Tree`各处的“被标记的`fiberNode`”。
`completeWork`属于“归”阶段，从叶子元素开始，整体流程是“自下而上”的。`fiberNode.subtreeFlags`记录了该`fiberNode`的“所有子孙`fiberNode`上被标记的`flags`”。每个`fiberNode`经由如下操作，可以将子孙`fiberNode`中“标记的`flags`”向上冒泡一层：

```js
let subtreeFlags = NoFlags;
// 收集子 fiberNode 的子孙 fiberNode 中标记的 flags
subtreeriags |= child.subtreeFlags;
// 收集子 fiberNode 标记的 flags
subtreeFlags |= child.flags;
// 附加在当前 fiberNode 的 subtreeFlags 上
completedWork.subtreeFlags |= subtreeFlags;
```

当`HostRootFiber`完成`completeWork`，整棵`Wip Fiber Tree`中所有“被标记的`flags`都在`HostRootFibersubtreeFlags`中定义。在`Renderer`中，通过任意一级 `fiberNodesubtreeFlags`都可以快速确定“该`fiberNode`所在子树是否存在副作用需要执行”。

### 3.3.2 mount 概览

以`HostComponent`（原生`DOM`元素对应的`fiberNode`类型）为例讲解`completeWork`流程：<br/>![](/md_images/书中的流程图/3-2.png)
`completeWork`在`mount`时的流程总结如下:
(1)根据`wip.tag`进入不同处理分支；
(2)根据`curent!=null`区分`mount`与`update`流程；
(3)对于`HostComponent`，首先执行`createInstance`方法创建对应的`DOM`元素；
(4)执行`appendAllChildren`将下一级`DOM`元素挂载在步骤(3)创建的`DOM`元素下;
(5)执行`finalizeInitialChildren`方法完成属性的初始化；·
(6)最后执行`bubbleProperties`方法将`flags`冒泡。

上面提到`beginWork`的`mountChildFibers`不会标记`flags`，但是`completeWork`执行到`HostRootFiber`时，已经形成一棵完整的离屏`DOM Tree`。`HostRootFiber`存在`alternate`（即`HostRootFiber.current!==null`），所以`HostRootFiber`在`beginWork`时会进入`reconcileFibers`而不是`mountChildFibers`，但是下面所有的子`fiberNode`都会进入`reconcileFibers`，当冒泡到`HostRootFiber`时，可实现一次性插入所有`DOM`，减少大量子`fiberNode`带来的插入操作。
![](/md_images/书中的流程图/2-9.png)

### 3.3.3 update 概览

上面的`updateHostComponent`的主要逻辑在`diffProperties`方法中，该方法包括两次遍历:

- 第一次遍历，标记删除“更新前有，更新后没有”的属性;
- 第二次遍历，标记更新“update 流程前后发生改变”的属性。

所有变化属性的`key`、`value `会保存在`fberNode.updateQueue`中。同时，该`fiberNode`会标记`Update`:

```js
workInProgress.flags = Update;
```

在`fiberNode.updateQueue`中，数据以`key`、`value`作为数组的相邻两项。举例说明点击`DIV`元素触发更新，此时`style`、`title`属性发生变化:

```jsx
export default () => {
	const [num, updateNum] = useState(0);
	return (
		<div
			onClick={() => updateNum(num + 1)}
			style={{ color: `#${num}${num}${num}` }}
			title={num + ''}
		></div>
	);
};
```

此时`fberNode.updateQueue`保存的数据如下，代表“`title`属性变为'1’”,“`style`属性中的 color 变为'#111’”:

```js
['title', '1', 'style', { color: '#111' }];
```

## 3.4 实现 ReactDOM Renderer

前面介绍的一些`API`如`createInstance`、`appendInitialChild`、`finalizeInitialChildren`需要手动实现。
具体可看对应源码实现。
