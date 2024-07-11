## 6-1 前言

在 [第 4 节](./4、实现更新机制.md) 中，我们提到 `React` 更新流程有四个阶段：

- 触发更新（Update Trigger）
- 调度阶段（Schedule Phase）
- 协调阶段（Reconciliation Phase）
- 提交阶段（Commit Phase）

之前我们已经实现了协调阶段（Reconciliation Phase）的 `beginWork` 和 `completeWork` 函数，接下来我们会实现提交阶段（Commit Phase）。

提交阶段的主要任务是将更新同步到实际的 DOM 中，执行 DOM 操作，例如创建、更新或删除 DOM 元素，反映组件树的最新状态，可以分为三个主要的子阶段：

- **Before Mutation (布局阶段)**：主要用于执行 DOM 操作之前的准备工作，包括类似 getSnapshotBeforeUpdate 生命周期函数的处理。在这个阶段会保存当前的布局信息，以便在后续的 DOM 操作中能够进行比较和优化。
- **Mutation (DOM 操作阶段)**：执行实际 DOM 操作的阶段，包括创建、更新或删除 DOM 元素等。使用深度优先遍历的方式，逐个处理 Fiber 树中的节点，根据协调阶段生成的更新计划，执行相应的 DOM 操作。
- **Layout (布局阶段)**：用于处理布局相关的任务，进行一些布局的优化，比如批量更新布局信息，减少浏览器的重排（reflow）次数，提高性能。其目标是最小化浏览器对 DOM 的重新计算布局，从而提高渲染性能。

## 6-2 实现 commitWork

首先，在 `weak-react\packages\react-reconciler\src\workLoop.ts` 的 `renderRoot` 函数中，执行 `commitRoot` 函数。

- `commitRoot` 是开始提交阶段的入口函数，调用 `commitWork` 函数进行实际的 DOM 操作；
- `commitWork` 函数是提交阶段的核心，它会判断根节点是否存在上述 3 个阶段需要执行的操作，并执行实际的 DOM 操作，并完成 Fiber 树的切换。

我们先只实现 Mutation 阶段的功能，目前已支持的 DOM 操作有：`Placement | Update | ChildDeletion`，判断根节点的 `flags` 和 `subtreeFlags` 中是否包含这三个操作，如果有，则调用 `commitMutationEffects` 函数执行实际的 `DOM` 操作。

需要注意的是，由于 `current` 是与视图中真实 `UI` 对应的 `Fiber` 树，而 `workInProgress` 是触发更新后正在 `Reconciler` 中计算的 `Fiber` 树，因此在 `DOM` 操作执行完之后，需要将 `current` 指向 `workInProgress`，完成 `Fiber` 树的切换。

```ts
// weak-react\packages\react-reconciler\src\workLoop.ts
import { MutationMask, NoFlags } from './fiberFlags';
import { commitMutationEffects } from './commitWork';
// ...

function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root);
	do {
		try {
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop发生错误：', e);
			workInProgress = null;
		}
	} while (true);

	// 创建根 Fiber 树的 Root Fiber
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;

	// 提交阶段的入口函数
	commitRoot(root);
}

// 提交阶段的入口函数
function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.log('commit 阶段开始');
	}

	// 重置
	root.finishedWork = null;

	// 判断是否存在 3 个子阶段需要执行的操作
	const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffects || rootHasEffects) {
		// TODO: BeforeMutation

		// Mutation
		commitMutationEffects(finishedWork);
		// Fiber 树切换，workInProgress 变成 current
		root.current = finishedWork;

		// TODO: Layout
	} else {
		root.current = finishedWork;
	}
}
```

## 6-3 实现 Mutation

接下来我们来实现 Mutation 阶段执行 DOM 操作的具体实现，新建 `weak-react\packages\react-reconciler\src\commitWork.ts` 文件，定义 `commitMutationEffects` 函数。

`commitMutationEffects` 函数负责深度优先遍历 Fiber 树，递归地向下寻找子节点是否存在 Mutation 阶段需要执行的 flags，如果遍历到某个节点，其所有子节点都不存在 flags（即 `subtreeFlags == NoFlags`），则停止向下，调用 `commitMutationEffectsOnFiber` 处理该节点的 flags，并且开始遍历其兄弟节点和父节点。

`commitMutationEffectsOnFiber` 会根据每个节点的 flags 和更新计划中的信息执行相应的 DOM 操作。

以 `Placement` 为例：如果 Fiber 节点的标志中包含 `Placement`，表示需要在 DOM 中插入新元素，此时就需要取到该 Fiber 节点对应的 DOM，并将其插入对应的父 DOM 节点中。

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

import { Container, appendChildToContainer } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';

// 用于追踪当前需要处理的Fiber节点
let nextEffect: FiberNode | null = null;

// mutation 阶段，提交 HostComponent 的 side effect，也就是DOM节点的操作(增删改)
export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;

	// 深度优先遍历 Fiber 树，寻找更新 flags
	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;
		if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
			// 子节点存在 mutation 阶段需要执行的 flags
			nextEffect = child;
		} else {
			// 子节点不存在 mutation 阶段需要执行的 flags 或没有子节点
			// 向上遍历
			up: while (nextEffect !== null) {
				// 处理 flags
				commitMutationEffectsOnFiber(nextEffect);

				const sibling: FiberNode | null = nextEffect.sibling;
				// 遍历兄弟节点
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				// 遍历父节点
				nextEffect = nextEffect.return;
			}
		}
	}
};

// 遍历 Fiber 树，处理 flags
const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		// TODO Update
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		// TODO ChildDeletion
		finishedWork.flags &= ~ChildDeletion;
	}
};

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Placement 操作', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

// 获取 parent DOM
const getHostParent = (fiber: FiberNode): Container | null => {
	let parent = fiber.return;
	while (parent !== null) {
		const parentTag = parent.tag;
		// 处理 Root 节点
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		// 处理原生 DOM 元素节点
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		} else {
			parent = parent.return;
		}
	}
	if (__DEV__) {
		console.warn('未找到 host parent', fiber);
	}
	return null;
};

// 遍历子节点，将子节点的 DOM 插入到 parent DOM 中（递归插入）
const appendPlacementNodeIntoContainer = (finishedWork: FiberNode, hostParent: Container) => {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		// 插入到 parent DOM 中
		appendChildToContainer(finishedWork.stateNode, hostParent);
	} else {
		const child = finishedWork.child;
		if (child !== null) {
			appendPlacementNodeIntoContainer(child, hostParent);
			let sibling = child.sibling;
			while (sibling !== null) {
				appendPlacementNodeIntoContainer(sibling, hostParent);
				sibling = sibling.sibling;
			}
		}
	}
};
```

其中，实现插入到 parent DOM 中的工具函数定义在`weak-react\packages\react-reconciler\src\hostConfig.ts`中。

```ts
// weak-react\packages\react-reconciler\src\hostConfig.ts

export const appendChildToContainer = (child: any, parent: Container) => {
	const prevParentID = child.parent;

	if (prevParentID !== -1 && prevParentID !== parent.rootID) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parent.rootID;
	parent.children.push(child);
};
```

---

至此，我们就完成了 React 更新流程中的提交阶段（Commit Phase），实现了 DOM 树更新，下一节我们将开始实现 react-dom 包，跑通整个 React 首屏渲染流程。

相关代码可在 `git tag weak-react-v1.6` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.6
