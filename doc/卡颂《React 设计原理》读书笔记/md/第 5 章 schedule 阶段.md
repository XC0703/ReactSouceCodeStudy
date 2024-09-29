# 第 5 章 schedule 阶段

## 5.1 前言

React 中并发更新的体系结构如下图所示：
![](/md_images/书中的流程图/5-1.png)
本章介绍的 schedule 调度器为“Time Slice 分割出的一个个短宏任务”提供了执行的驱动力。

Scheduler 预置了五种优先级，优先级依次降低：

- ImmediatePriority
- UserBlockingPriority
- NormalPriority
- LowPriority
- IdlePriority

`Scheduler` 对外导出的 `scheduleCallback` 方法接收一个回调函数和一个优先级参数，优先级参数默认为 `NormalPriority`：

```js
// 以 LowPriority 优先级调度一个回调函数
scheduleCallback(LowPriority, fn);
```

在执行 scheduleCallback 之后会生成 task 这一数据结构，代表一个被调度的任务：

```js
const task1 = {
	// 省略其它字段
	expirationTime: startTime + timeout,
	callback: fn
};
```

其中 `expirationTime` 代表 `task1` 的国企时间，`Scheduler` 内部会根据这个时间来决定何时执行这个任务。 `timeout` 表示不同优先级对应不同的 `timeout`，比如 `ImmediatePriority` 对应 -`1`，`IdlePriority` 对应 `1073741823`。

根据上面的讲解，此时的 Scheduler 流程如下图所示：
![](/md_images/书中的流程图/5-3.png)
此时根据该流程可以去看[第二版调度系统的实现代码](<../code/实现简易 schedule 阶段.js>)。
调度分为四种情况：

- 当执行“优先级低于 ImmediatePriority 的 work”时
- 当执行“优先级与 ImmediatePriority 相等”的 work 时
- 在低优先级 work 执行过程中插入高优先级 work 时
- 当高优先级 work 执行过程中插入低优先级 work 时

## 5.2 Scheduler 的实现

Scheduler 的实现原理如下图所示：<br>![](/md_images/书中的流程图/5-5.png)
在 `Scheduler` 中有两个容易混淆的概念：

- delay
- expirationTime

`delay` 代表“`task` 需要延迟执行的时间”，在 `scheduleCallback` 方法中配置,“配置 `delay` 后的 `task`”会先进入 `timerQueue` 中。当 `delay` 对应时间结束后,`task` 会从 `timerOueue`
中取出并移入 `taskOueue` 中。
`expirationTime` 代表“`task` 的过期时间”。不是所有 `task` 都会配置 `delay`，没有配置 `delay` 的 `task` 会直接进入 `taskQueue`。这就导致 `taskQueue` 中可能存在多个 `task`。前面介绍过，`task.expirationTime` 作为排序依据，其值越小代表 `task` 的优先级越高。除此之外，`task.expirationTime` 的另一个作用是“解决饥饿问题”(饥饿问题是指低优先级的 work 不断被新插入的高优先级 work 打断从而一直不能执行)
综上所述，**“配置 `delay` 且未到期的 `task`”一定不会执行。“配置 `delay` 且到期，或者未配置 `delay` 的 `task`”会根据 `task.expirationTime` 排序调度并执行，过期 `task` 执行时不会被打断。**

`Scheduler` 的调用流程如下图所示：<br>![](/md_images/书中的流程图/5-6.png)
可以看出，`Scheduler` 的完整执行流程包括如下两个循环:
(1)`taskQueue` 的生产(从 `timerOueue` 中移入或执行 `scheduleCallback` 生成)到消费的过程(即图 `5-6` 中灰色部分)，这是一个异步循环；
(2)`taskOueue` 的具体消费过程(即 `workLoop` 方法的执行)，这是一个同步循环。

当 timerQueue 中的第一个 task 延迟的时间到期后，执行 advanceTimers 将“到期的 task”从 timerQueue 中移入 taskQueue 中，这个操作要依靠优先队列实现（小顶堆）。

workLoop 方法会在“新的宏任务中”执行。浏览器会在宏任务执行间隙执行 Layout、Paint、Composite 等操作。一帧时间执行的工作如下：<br/> ![](/md_images/书中的流程图/5-8.png)
其中 rAF 指的是 requestAnimationFrame,rIC 指的是 requestIdleCallback，这两个时机都是执行 workLoop 方法时机的备选项，但因为都有各自的缺陷而没有被使用。

- 在支持 setImmediate 的环境（Node.js、旧版本 IE）中，scheduler 使用 setImmediate 调度宏任务；
- 在支持 MessageChannel 的环境（浏览器、Worker）中，scheduler 使用 MessageChannel 调度宏任务；
- 其余情况使用 setTimeout 调度宏任务。

## 5.3 lane 模型

### 5.3.1 React 与 Scheduler 的关系

从产生交互到 `render` 阶段概览如下：<br/>![](/md_images/书中的流程图/5-9.png)
注意，上图中的 `workLoop` 和上面`Scheduler` 的调用流程中的 `workLoop` 不是同一个，只是重名。
在[第二版调度系统的实现代码](<../code/实现简易 schedule 阶段.js>)中：

- “不同按钮对应不同优先级”对应“不同交互产生不同优先级”;
- “`schedule` 方法选出优先级”对应 `schedule` 阶段;
- “`perform` 方法执行 `work`”对应 `render` 阶段。

在简易版本中，`schedule` 方法会选择一个优先级(最高优先级)，实际在选出一个优先级的同时，会再选出一批优先级。选出的这个优先级会作为“`Scheduler` 调度的优先级”，选出的一批优先级则会参与 `render` 阶段。
前面提到 Schedulder 有五种优先级，但 React 只有四种优先级， 具体来说，在 React 中,“不同交互对应的事件回调中产生的 update”会拥有不同优先级。由于优先级与“事件”相关，所以被称为 EventPriority(事件优先级)，其中：

- `DiscreteEventPriority` 对应“离散事件的优先级”，例如 click、input、focus、blurtouchstart 等事件都是离散触发的；
- `ContinuousEventPriority` 对应“连续事件的优先级”,例如 drag、mousemove、scrolltouchmove、wheel 等事件都是连续触发的；
- `DefaultEventPriority` 对应“默认的优先级”，例如通过计时器周期性触发更新这种情况产生的 update 不属于“交互产生的 update”，所以优先级是默认的优先级;
- `IdleEventPriority` 对应“空闲情况的优先级”。

从 React 到 Scheduler，优先级需要经过以下两次转换：
（1）从 lanes 转换为 EventPrioirty
（2）将 EventPriority 转换为 Scheduler 优先级

举例说明，在 `onClick` 回调中触发的更新，属于 `DiscreteEventPriority`，对应 `Scheduler` 中的 `ImmediatePriority`。这意味着“点击事件中触发的更新会同步处理”。

### 5.3.2 基于 expirationTime 的优先级

`Scheduler` 旧的优先级算法采用基于 `expirationTime` 的优先级（旧模型），其核心思想是：
每当进入 `scheduler` 阶段，会选出优先级最高的 `update` 进行调度（不同优先级对应不同的 `timeout`，最终对应不同的 `expirationTime`，作为优先级排序的依据）。
同时，由于 `schedule` 阶段的存在，不同的 `fiberNode` 上可能存在多个 `update`，这些 `update` 对应的优先级可能不同，`React` 会按“批”更新，即：经由 `schedule` 阶段优先级算法决定的优先级，及“与该优先级同一批的优先级”，它们对应的 `update` 会共同参与状态计算。所以，需要一种算法能够基于某一个优先级（批对应的优先级下限），计算出属于同一批的所有优先级。
目前这套算法模型只需考虑任务中断与继续、高优先级任务打断低优先级任务的情况，这一时期该特性被称为 Async Mode （异步模式）。
在此之后，React 将 I/O 密集型场景纳入优化范畴（通过 Suspense），这一时期 Async Mode 迭代为 Concurrent Mode。（因为对于 I/O 密集型场景，高优先级 I/O update 会阻塞低优先级 I/O update，所以需要一种机制来避免阻塞）。

两种基于 expirationTime 划分批的算法如图所示：

![](/md_images/书中的流程图/5-10.png)

从上面的图可以看出，expirationTime 模型的优先级算法最大的问题在于:expirationTime 字段耦合了“优先级”与“批”这两个概念，限制了模型的表达能力。优先级算法的本质是“为 updae 排序”，但 expirationTime 模型完成排序的同时也划定了“批”。如果要调整“批”，就会改变排序。（比如无法简单实现将上图中的 u0、u2、u4 划分为一批）。正是由于这个原因，lane 模型取代了 expirationTime 模型。

### 5.3.3 基于 lane 的优先级

`Lane` 模型是一种用于调度更新任务的机制，其目的是提高应用的性能和响应速度。`React` 中涉及的 `Lane` 主要有以下几种：

- `SyncLane`：同步更新 `Lane`，用于处理需要立即得到执行的更新任务，例如由 `ReactDom.render`() 或 `ReactDOMServer.renderToString`() 触发的更新任务。
- `InputContinuousLane`：连续
- `DefaultLane`：默认 `Lane`，用于处理普通的更新任务，例如由 `useEffect`() 或 `useLayoutEffect`() 触发的更新任务。
- `IdleLane`：空闲 `Lane`，用于处理空闲时需要执行的更新任务，例如预加载图片等。

Lane 的具体值为 32 位数字：

```js
const SyncLane: Lane = /*  */ 0b0000000000000000000000000000010;
const IdleLane: Lane = /* */ 0b0100000000000000000000000000000;
const InputContinuousLane: Lane = /* */ 0b0000000000000000000000000001000;
const DefaultLane: Lane = /* */ 0b0000000000000000000000000100000;
```

这些 Lane 的优先级顺序依次降低，SyncLane 的优先级最高，IdleLane 的优先级最低。 而在 React 源码中，相关的 EventPriority 定义在 ReactEventPriorities.js 文件中，其定义如下：

```js
const DiscreteEventPriority = SyncLane;
const ContinuousEventPriority = InputContinuousLane;
const DefaultEventPriority = DefaultLane;
const IdleEventPriority = IdleLane;
```

以下里四个事件优先级：

- 离散事件（DiscreteEvent）：指需要立即执行的事件，例如输入框的 onChange 事件。这些事件需要立即得到响应，以保证应用的交互性能。
- 用户交互事件（UserBlockingEvent）：指与用户交互相关的事件，例如点击、滚动等。这些事件也需要尽快得到响应，以提供流畅的用户体验。
- 普通事件（NormalEvent）：指一般的更新事件，例如数据更新、网络请求等。这些事件的优先级较低，可以等待一段时间再执行。
- 空闲事件（IdleEvent）：指可以在浏览器空闲时执行的事件，例如预加载图片等。这些事件的优先级最低，只有在没有其他任务需要执行时才会执行。

首先，React 每次更新状态会将同类型的 Lane 合并形成 Lanes，然后从同类型的 Lanes 中找出优先级最高的事件。
首先，React 通过位运算 lane & lane 判断两个 lane 是否是同一类型，如果是，再使用 lane | lane 将 lane 合并成 lanes。（基于位运算，lane 模型可以很方便地讲“多个不相邻的优先级”划分为批，使得“基于 lane 模型的 React”能够同时适用于 CPU 密集型场景和 I/O 密集场景）

```js
function mergeLanes(a, b) {
	return a | b;
}
function intersectLanes(a, b) {
	return a & b;
}
queueLanes = intersectLanes(queueLanes, root.pendingLanes);
const newQueueLanes = mergeLanes(queueLanes, lane);
queue.lanes = newQueueLanes;
```

需要更新状态时，使用 lanes & -lanes 从相同的 lanes 中找出优先级最高的 lane：

```js
function getHighestPriorityLane(lanes) {
	return lanes & -lanes;
}
```

然后将这个 lane 转为对应的 EventPriority：

```js
function lanesToEventPriority(lanes) {
	const lane = getHighestPriorityLane(lanes);
	if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
		return DiscreteEventPriority;
	}
	if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
		return ContinuousEventPriority;
	}
	if (includesNonIdleWork(lane)) {
		return DefaultEventPriority;
	}
	return IdleEventPriority;
}
```

当事件需要处理时，`React` 总会将优先级最高的事件交给 `Scheduler` （调度包）转换为更新任务，并将其加入任务队列中。任务队列中的任务按照事件优先级从高到低排序，以确保高优先级任务优先执行。 在 `Scheduler` 中又会将 `EventPriority` 优先级转换为任务优先级。然后根据任务优先级进行排序。

```js
let schedulerPriorityLevel;
switch (lanesToEventPriority(nextLanes)) {
  case DiscreteEventPriority:
    schedulerPriorityLevel = ImmediatePriority;
    break;
  case ContinuousEventPriority:
    schedulerPriorityLevel = UserBlockingPriority;
    break;
  case DefaultEventPriority:
    schedulerPriorityLevel = NormalPriority;
    break;
  case IdleEventPriority:
    schedulerPriorityLevel = IdlePriority;
    break;
  default:
    schedulerPriorityLevel = NormalPriority;
    break;
```

任务优先级和 EventPriority 优先级对应该关系也如上面代码 switch 的对应关系。

将 schedule 阶段、render 阶段、commit 阶段结合后的流程概览如下图所示（lane 模型的应用贯穿其中）：<br/>![](/md_images/书中的流程图/5-11.png)

在 React 中，“解决饥饿问题”视角下的工作流程如下图所示：<br/>![](/md_images/书中的流程图/5-13.png)

## 5.4 批量更新

Batched Updates（批量更新）属于一种性能优化手段，将多次更新流程合并为一次更新流程，从而减少渲染次数，提高性能。（注意不要将这里的“Batched”（译为“批”）与上面 lanes 的概念混淆，Batched Updates 是指“一到多个更新流程的合并”，lanes 是指“多个不相邻的更新流程”的合并）

v18 之前主要是半自动批量更新与手动批量更新，v18 之后的是“基于 lane 模型的调度策略”自动完成的。（原理对于 SyncLane，更新会在微任务队列中被调度执行，当有 work 正在调度时产生了“同优先级”的新 work，则不会产生新的调度。）
