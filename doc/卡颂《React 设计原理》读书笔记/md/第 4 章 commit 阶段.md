# 第 4 章 commit 阶段

## 4.1 前言

随着 `render` 阶段的完成，也意味着在内存中构建 `workInProgress Fiber` 树的所有工作都已经完成，这其中包括了对 `Fiber` 节点的 `update`、`diff`、`flags` 标记、`subtreeFlags` ( `effectList` ) 的收集等操作。
我们知道，在 `render` 阶段，会将需要更新的节点标记上 `flags` ( `effectTag` ) ，在 `completeWork` 阶段会形成 `effectList` 链表，连接所有需要被更新的节点。
为了将这些需要更新的节点应用到真实 `DOM` 上却不需要遍历整棵树，在 `commit` 阶段，会通过遍历这条 `EffectList` 链表，执行对应的操作，来完成对真实 `DOM` 的更新，这也叫做 `mutation`，即 `DOM` 节点的增删改操作。
在新版本中不再需要 `effectList` 链表了，而是通过 `rootFiber` 自下而上调和的方式处理这些标志，执行对应的操作，来完成对真实 `DOM` 的更新。

`commit` 阶段会做以下这些事情

对一些生命周期和副作用钩子的处理，比如 类组件的 `componentDidMount` 、`componentDidUpdate`，函数组件的 `useEffect`、`useLayoutEffect` 、`useInsertionEffect` 等
另一方面，在一次 `Update` 中，进行添加节点（`Placement`）、更新节点（`Update`）、删除节点（`Deletion`）、同时有对 `ref` 的处理等。

`commit` 阶段的入口在 `commitRoot` 函数，在这里会发起一个最高优先级的调度任务，然后调用 `commitRootImpl` 函数来处理副作用，将最新的 `Fiber` 树同步到 `DOM` 上。

```js
function commitRoot(root) {
	const previousUpdateLanePriority = getCurrentUpdatePriority();
	const prevTransition = ReactCurrentBatchConfig.transition;
	try {
		ReactCurrentBatchConfig.transition = 0;
		setCurrentUpdatePriority(DiscreteEventPriority); // 最高优先级调度
		commitRootImpl(root, previousUpdateLanePriority); // commit 主流程
	} finally {
		// 重置
		ReactCurrentBatchConfig.transition = prevTransition;
		setCurrentUpdatePriority(previousUpdateLanePriority);
	}

	return null;
}
```

## 4.2 流程概览

`commit` 阶段主要针对 `rootFiber` 上的 `effectList` 进行处理，根据对 `DOM` 的操作时机可以分为三个子阶段：

- `Before mutation` 阶段（执行 `DOM` 操作前）：读取组件变更前的状态

  - 对于 `CC` 而言，会执行 `getSnapshotBeforeUpdate`，获取 `DOM` 更新前的组件实例信息（更新前）
  - 对于 `FC` 而言，会异步调度 `useEffect` 钩子

- `mutation` 阶段（执行 `DOM` 操作）：

  - 对于 `HostComponent` 会执行相应的 `DOM` 操作
  - 对于 `CC` 会调用 `componentWillUnmount`
  - 对于 `FC` 会执行 `useLayoutEffect` 的销毁函数

- `layout` 阶段（执行 `DOM` 操作后）：在 `DOM` 操作完成后，读取当前组件的状态（更新后）

在这当中，需要注意的是，在 `mutation` 阶段结束后，`layout` 开始之前，`workInProgress` 树会切换成 `current` 树。这样做是为了：

- 在 `mutation` 阶段调用类组件的 `componentWillUnmount` 的时候， 可以获取到卸载前的组件信息
- 在 `layout` 阶段调用 `componentDidMount`/`Update` 时，获取的组件信息是组件更新后的。

![](/md_images/书中的流程图/4-1.png)

## 4.3 BeforeMutation 阶段

首先是 `BeforeMutation` 阶段，在 `BeforeMutation` 阶段，会执行 `commitBeforeMutationEffects` 函数，因为此时还没有对真实 `DOM` 进行修改，因此是获取 `DOM` 快照的最佳时期，同时也会在此异步调用 `useEffect`。

- 执行 `commitBeforeMutationEffectsOnFiber` 函数
- `DOM` 组件的 `blur` 和 `focus` 事件相关
- 对于类组件，执行 `getSnapshotBeforeUpdate` 生命周期函数
- 如果 `FC` 中使用到的 `useEffect` ，会通过 `scheduleCallback` 来调度 `passiveEffect` 异步执行。

> passiveEffect 就是 useEffect 对应的 effectTag

`beforemutation` 阶段的主要控制函数在于 `commitBeforeMutationEffects`，主要做的事情就是初始化全局变量 `nextEffect` 以及 `focusedInstanceHandle`，然后调用 `commitBeforeMutationEffects_begin` 来处理副作用。

![](/md_images/image/4-1.png)

```js
exportfunction commitBeforeMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
) {
  focusedInstanceHandle = prepareForCommit(root.containerInfo);

  nextEffect = firstChild;
  // NOTE：开始执行，
  commitBeforeMutationEffects_begin();

  // 不再跟踪fiber节点
  const shouldFire = shouldFireAfterActiveInstanceBlur;
  shouldFireAfterActiveInstanceBlur = false;
  focusedInstanceHandle = null;

  return shouldFire;
}
```

### 4.3.1 准备工作

首先会执行 `prepareForCommit` 函数，调用 `getClosestInstanceFromNode` 方法，获取当前节点最近的 `HostComponent` 或 `HostText` 类型对应的 `Fiber` 节点，来**初始化全局变量** `focusedInstanceHandle`，用来处理 `focus` 状态。

```js
exportfunction prepareForCommit(containerInfo: Container): Object | null {
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();
  selectionInformation = getSelectionInformation();
  let activeInstance = null;
  if (enableCreateEventHandleAPI) {
    const focusedElem = selectionInformation.focusedElem;
    if (focusedElem !== null) {
      activeInstance = getClosestInstanceFromNode(focusedElem);
    }
  }
  ReactBrowserEventEmitterSetEnabled(false);
  return activeInstance;
}
```

### 4.3.2 commitBeforeMutationEffects_begin

在 `commitBeforeMutationEffects_begin` 函数中会从上往下遍历，找到**最底部**并且有标记了 `before mutation` 的 `fiber` 节点，调用`commitBeforeMutationEffects_complete` 函数来更新 `props` 和 `state`。
如果当前的 `Fiber` 节点上的 `deletions` 字段被标记了值，意味着节点即将被删除，会调用 `commitBeforeMutationEffectsDeletion` 来创建 `blur` 事件并进行派发。
因此可以知道 `begin` 流程主要做了两件事：

- 如果子代 `Fiber` 树上有 `before mutation` 标记，会把 `nextEffect` 赋值给子 `Fiber`，也就是向下递归找到有标记 `before mutation` 的 `Fiber`。
- 找到后，执行 `commitBeforeMutationEffects_complete` 函数

从 `commitBeforeMutationEffects_begin` 的执行上，我们可以知道：`commit` 阶段执行的生命周期以及钩子函数是**先子后父**的，这是因为如果在子组件中的生命周期内改变 DOM 状态，还要在父组件生命周期中同步状态。

```js
function commitBeforeMutationEffects_begin() {
	while (nextEffect !== null) {
		const fiber = nextEffect;
		// This phase is only used for beforeActiveInstanceBlur.
		// Let's skip the whole loop if it's off.
		if (enableCreateEventHandleAPI) {
			const deletions = fiber.deletions;
			if (deletions !== null) {
				for (let i = 0; i < deletions.length; i++) {
					const deletion = deletions[i];
					// 调用 dispatchBeforeDetachedBlur() 来创建 blur 事件并派发
					commitBeforeMutationEffectsDeletion(deletion);
				}
			}
		}

		const child = fiber.child;
		if ((fiber.subtreeFlags & BeforeMutationMask) !== NoFlags && child !== null) {
			ensureCorrectReturnPointer(child, fiber);
			nextEffect = child;
		} else {
			// 更新fiber节点的 props 和 state
			commitBeforeMutationEffects_complete();
		}
	}
}
```

### 4.3.3 commitBeforeMutationEffectsOnFiber

在 `commitBeforeMutationEffects_begin` 中会调用 `commitBeforeMutationEffects_complete` 函数，在 `commitBeforeMutationEffects_complete` 中会从下到上归并，（`sibling` 到 `parent`）执行 `commitBeforeMutationEffectsOnFiber` 函数，这也是 `before_mutation` 的**核心逻辑**：

- 首先会处理 `blur` 和 `focus` 相关逻辑
- 其次会执行 `getSnapshotBeforeUpdate` 的生命周期函数

会根据 Fiber 节点 tag 的不同进入不同的处理逻辑，同时会根据 current 是否存在来判断是 mount 还是 update 阶段，进入不同的处理逻辑。
**对于 CC 而言，最重要的就是触发生命周期函数，获取当前 DOM 的数据信息。**

```js
function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber) {
    const current = finishedWork.alternate;
    const flags = finishedWork.flags;
     ...
    if ((flags & Snapshot) !== NoFlags) {
         ...
        switch (finishedWork.tag) {
            case FunctionComponent:
            case ForwardRef:
            case SimpleMemoComponent: {
                break;
            }
            case ClassComponent: {
                if (current !== null) {
                    // 非首次渲染的情况
                    // 获取上一次的props
                    const prevProps = current.memoizedProps;
                    // 获取上一次的 state
                    const prevState = current.memoizedState;
                    // 获取当前 class组件实例
                    const instance = finishedWork.stateNode;
                    // 更新 props 和 state
                    ...
                    // 调用 getSnapshotBeforeUpdate 生命周期方法
                    const snapshot = instance.getSnapshotBeforeUpdate(
                        finishedWork.elementType === finishedWork.type
                            ? prevProps
                            : resolveDefaultProps(finishedWork.type, prevProps),
                        prevState,
                    );
                     ...
                    // 将生成的 snapshot 保存到 instance.__reactInternalSnapshotBeforeUpdate 上
                    // 供 DidUpdate 生命周期使用
                    instance.__reactInternalSnapshotBeforeUpdate = snapshot;
                }
                break;
            }
             ...
        }
      ...
    }
}
```

从 `React 16` 版本开始，`componentWillXX` 生命周期函数加上了 `UNSAFE`_ 的前缀，这是因为 `Reconciler` 重构为 `Fiber Reconciler` 后，`render` 阶段执行的任务可能会因为某些特殊原因（有优先级更高任务）会被**中断或者是重新开始**，对应的组件在 `render` 阶段的生命周期钩子(即 `componentWillXX` )可能会有**触发多次**的情况，因此加上了 `UNSAFE`_ 前缀，减少使用 `getSnapShotBeforeUpdate` 生命周期函数，它是在 `commit` 阶段内的 `before mutation` 阶段调用的，由于 `commit` 阶段是**同步执行**的，所以不会遇到多次调用的情况。

### 4.3.4 调度 useEffect

> 这一部分在 `commitBeforeMutationEffects` 函数执行之前，也属于 `before mutation` 阶段。

对于 `useEffect` ,会通过 `scheduler` 模块提供的 `scheduleCallback` 进行调度，用来**以某个优先级异步调度一个回调函数**。

```js
// 调度 useEffect
if (
	(finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
	(finishedWork.flags & PassiveMask) !== NoFlags
) {
	if (!rootDoesHavePassiveEffects) {
		rootDoesHavePassiveEffects = true;
		pendingPassiveEffectsRemainingLanes = remainingLanes;
		scheduleCallback(NormalSchedulerPriority, () => {
			// 触发 useEffect
			flushPassiveEffects();
			return null;
		});
	}
}
```

在此处，被异步调度的回调函数就是触发 `useEffect` 的方法 `flushPassiveEffects`，这个回调函数会在调度后执行，**相当于在这里注册了这个回调函数**。
所以整个 `useEffect` 异步调用分为三步：

1. `before mutation` 阶段在 `scheduleCallback` 中调度 `flushPassiveEffects`
2. `layout` 阶段之后将 `effectList` 赋值给 `rootWithPendingPassiveEffects`
3. `scheduleCallback` 触发 `flushPassiveEffects`，`flushPassiveEffects` 内部遍历 `rootWithPendingPassiveEffects`

**在 React 官方文档中，也对 useEffect 的执行时机做出了解释：**

> 与 `componentDidMount`、`componentDidUpdate` 不同的是，传给 `useEffect` 的函数**会在浏览器完成布局与绘制之后**，在一个延迟事件中被调用。这使得它适用于许多常见的副作用场景，比如设置订阅和事件处理等情况，因为绝大多数操作不应阻塞浏览器对屏幕的更新。
> 此外，从 React 18 开始，当它是离散的用户输入（如点击）的结果时，或者当它是由 flushSync 包装的更新结果时，传递给 useEffect 的函数将在**屏幕布局和绘制之前同步执行(因此可能会影响性能)**。这种行为便于事件系统或 flushSync 的调用者观察该效果的结果。

## 4.4 Mutation 阶段

`mutation` 阶段负责**执行 DOM 操作**，与 `before mutation` 阶段类似，采用**向下遍历，向上归并**的方式工作，执行对应的函数，这里执行的是 `commitMutationEffects` 函数，它会通过调用 `commitMutationEffects_begin` 函数来开始本次的 `mutation` 阶段的工作。

> React 将每一个阶段又分为了 begin 和 complete，这样将逻辑进行抽离，主函数流程更加清晰。

```js
exportfunction commitMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
  committedLanes: Lanes,
) {
  inProgressLanes = committedLanes; // 优先级相关
  inProgressRoot = root;
  nextEffect = firstChild;

  commitMutationEffects_begin(root);

  inProgressLanes = null;
  inProgressRoot = null;
}
```

### 4.4.1 commitMutationEffects_begin 入口

这个函数的主体是一个 `while` 循环，会从 `rootFiber` 开始向下遍历，和 `before mutation` 的工作一样，找到最底层的有 `mutation` 标志的 `fiber` 节点，执行 `commitMutationEffects_complete` 函数。
如果遍历到的 `Fiber` 上有 `Deletion` 标记，则调用 `commitDeletion` 函数，分离 `ref` 引用，并调用 `componentWillUnmount` 生命周期函数，断开 `Fiber` 与父节点的连接关系。这些工作都在 `commitDeletion` 函数中进行处理。

> 这是在 React 17.0.3 之后才启用的字段，会在需要被 delete 掉的 Fiber 节点上的 deletions 字段上打上标记，这样可以直接通过 deletions 字段来判断是否需要删除该节点。

```js
function commitMutationEffects_begin(root: FiberRoot) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const deletions = fiber.deletions;
    if (deletions !== null) {
      for (let i = 0; i < deletions.length; i++) {
        const childToDelete = deletions[i];
        try {
          // 断开当前 Fiber 节点与 父节点之间的连接
          // 分离 ref ，调用 componentWillUnmount
          commitDeletion(root, childToDelete, fiber);
        } catch (error) {
          ...
        }
      }
    }

    const child = fiber.child;
    // ... 省去判断逻辑 nextEffect = child;
    commitMutationEffects_complete(root);
  }
}
```

### 4.4.2 commitMutationEffects_complete

在 `commitMutationEffects_complete` 函数中，**会开始归并，优先处理兄弟节点，最后处理父节点**，调用 `commitMutationEffectsOnFiber` 函数，根据不同的组件类型，来执行更新、插入、删除 DOM 的操作。

```js
function commitMutationEffects_complete(root: FiberRoot) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    ...
    // 核心，根据不同的类型，进行处理
    commitMutationEffectsOnFiber(fiber, root);
    ...
    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}
```

### 4.4.3 commitMutationEffectsOnFiber

在 `commitMutationEffectsOnFiber` 函数中：

1. 首先会判断是否需要**重置文本节点**
2. 然后判断**是否有 `ref` 的更新**
3. 然后会根据 Fiber 上的 `flags` 的类型进行**二进制计算，根据计算结果来执行不同的操作逻辑，这和前面介绍的 `effectTag` 的计算是相同的。会有多个 case 存在**：
   - **Placement**：执行 `commitPlacement` 函数插入 DOM 节点，然后删除 Placement 的 effectTag
   - **Update**：执行 `commitWork` 函数来执行更新操作，然后删除 Update 的 effectTag
   - **PlacementAndUpdate**：先调用 `commitPlacement` 执行插入操作，然后再调用 `commitWork` 执行更新操作。

### 4.4.4 Placement 插入节点

当 `flags` 包含 `Placement` 的 `effectTag` 时，会调用这个 `commitPlacement` 函数来执行对 `DOM` 节点的插入操作。主要的思路为：

1. 首先会根据当前的 Fiber 节点，来找到离他**最近的 Host 类型的 Parent Fiber 节点**
2. 然后根据 `Parent Fiber` 节点的 tag 类型，来判断父 Fiber 节点对应的 DOM 节点是否可以作为 container 容器，因为父节点有可能是一个 component 这样就不能直接插入
3. 当找到 `Parent Fiber` 之后，如果 `Parent Fiber` 上存在 `contentReset` 的 `effectTag `，就需要执行 `resetTextContent`，来重置文本
4. 接下来会找到当前 Fiber 节点的 Host 类型的 `slibing` 节点：

   - 当执行 `insertBefore` 时，就需要知道当前 Fiber 节点对应的**兄弟节点**
   - 当需要执行 `appendChild` 时，需要知道当前 Fiber 节点的 Host 类型 **Parent 节点**

5. 根据是否可以作为 container ，来**调用不同的函数**在指定的位置**插入新的节点**。实际上这两个函数的处理逻辑是一致的，**唯一的区别就是需不需要判断父节点是不是 `COMMENT_NODE`**

```js
function commitPlacement(finishedWork: Fiber): void {
  // NOTE：如果不支持 mutation 会直接返回了
  if (!supportsMutation) {
    return;
  }
  // NOTE：根据当前节点找到离他最近的 host 类型 fiber 节点
  // getHostParentFiber 一直向上递归查找，直到找到为止
  const parentFiber = getHostParentFiber(finishedWork);

  let parent;
  let isContainer;
  const parentStateNode = parentFiber.stateNode;
  // 根据父节点的 tag 类型，来判断是否能够作为被插入节点的container，（有可能是组件形式）
  switch (parentFiber.tag) {
    case HostComponent:
      parent = parentStateNode;
      isContainer = false;
      break;
    case HostRoot:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
      ...
  }
  // 如果父节点有 ContentReset 的 flags，则重置其文本内容
  if (parentFiber.flags & ContentReset) {
    resetTextContent(parent);
    parentFiber.flags &= ~ContentReset;
  }
  // 找到 host 的兄弟节点，需要在哪插入
  const before = getHostSibling(finishedWork);

  if (isContainer) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
  } else {
    insertOrAppendPlacementNode(finishedWork, before, parent);
  }
}
```

### 4.4.5 Update 更新节点

从前面的`commitMutationEffectsOnFiber`中可以知道，执行 DOM 元素更新操作的方法是 `commitWork`。
`commitWork` 函数会对不同类型的更新做出处理，重点关注 `HostComponent` 和 `HostText` 类型。整体流程如下：

- 首先会判断**是否支持 mutation**，执行其他的逻辑，这里我们的宿主环境不会进入当前逻辑，跳过这部分
- 接下来会根据 Fiber 节点的 tag 类型，进入不同的条件语句：
  - 对于和 `Function Component` 相关的类型，例如 `simpleMemoComponent`、`functionComponent` 等类型，会执行 `commitHookEffectListUnmount` 函数，也就是会调用 `useLayoutEffect` 或 `useInsertionEffect` 的销毁函数。
  - 对于 `HostComponent` 类型的节点，首先会获取到 新旧 props 以及 `updateQueue` ，最后调用 `commitUpdate` 来对 DOM 进行更新。
  - 对于 `HostText` 类型的更新，首先获取到真实的文本节点、新旧文本的内容，调用 `commitTextUpdate` 来更新文本节点的 `nodeValue`。

## 4.5 Layout 阶段

### 4.5.1 current Fiber 树的切换

在 `mutation` 阶段和 `layout` 阶段之间有一句关键的代码：

```js
root.current = finishedWork;
```

在双缓存机制部分中，当 `workInProgress Fiber` 树完成了渲染，就会将 `current` 指针从 `current Fiber` 树指向 `workInProgress Fiber` 树，也就是这行代码所做的工作。为什么要在 `mutation` 阶段结束后，`layout` 阶段之前执行呢？这是因为 `componentWillUnmount` 这个生命周期钩子函数，会在 `mutation` 阶段执行，此时可能会操作原来 `Fiber` 上的内容，为了保证数据的可靠性所以不会修改 `current` 指针。而在 `layout` 阶段会执行 `componentDidMount` 和 `componentDidUpdate` 生命周期钩子，此时需要获取到的 `DOM` 是更新后的。

### 4.5.2 流程概览

`layout` 阶段会执行 `commitLayoutEffect` 这个方法：

```js
commitLayoutEffects(finishedWork, root, lanes);
```

同样的会分为 `begin` 和 `complete` 两部分来执行，核心流程也是在 `xxxOnFiber` 中执行在 `commitLayoutEffect` 函数中，首先会对全局变量 `nextEffect` 进行赋值然后会执行 `commitLayoutEffects_begin` 函数，在这个函数中，会从 `nextEffect` 开始，向下遍历子树，调用 `commitLayoutMountEffects_complete` 函数来处理副作用，触发 `componentDidMount`、`componentDidUpdate` 以及各种回调函数等。

在进入 `commitLayoutMountEffects_complete` 方法后，其会对遍历到的每个 `Fiber` 节点执行 `commitLayoutEffectsOnFiber` 方法，这个方法会根据 `Fiber` 节点的 `tag` 类型不同，执行不同的操作：

- 对于 `Function component` 来说，会调用 `commitHookEffectListMount` 函数，首先会遍历所有 `useLayoutEffect` ，去执行它的回调函数。在前面我们知道了 `useLayoutEffect` 会在 `mutation` 阶段执行它上一次的销毁函数。在这里我们知道了在 `layout` 阶段会执行 `useLayoutEffect` 的回调函数，因此 useLayoutEffect 会先执行所有的销毁函数，再执行回调函数，这两步是同步执行。
- 对于 `ClassComponent` 而言：
  - 如果 `current` 为 `null` 会调用 `componentDidMount` 这个生命周期函数，因此也可以知道 `componentDidMount` 是在 `commit layout` 阶段同步执行的；
  - 当 `current` 不为 `null` 时，会执行 `componentDidUpdate` 生命周期函数，然后会调用 `commitUpdateQueue` 函数，遍历 `updateQueue` 上的 `effects`，执行 `effect` 副作用；
  - 如果 `setState` 有 `callback` 会放入 `updateQueue` 中，通过 `commitUpdateQueue` 来执行 `callback` 回调函数。
