## 10-1 处理 beginWork 阶段

1. 首先，我们需要比较是否可以复用当前的 `Fiber` 节点。
   1. 首先比较节点的 `key`，如果 `key` 不同，表示不能复用。
   2. 如果 `key` 相同，则继续比较节点的 `type`，如果 `type` 不同，同样不能复用。
   3. 如果 `key` 和 `type` 都相同，表示可以复用。
2. 如果不能复用当前的 `Fiber` 节点，则需要标记删除当前的 `Fiber` 节点，并创建一个新的 `Fiber` 节点。
3. 如果可以复用，就直接复用旧的 `Fiber` 节点。

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

function ChildReconciler(shouldTrackSideEffects: boolean) {
	// 处理单个 Element 节点的情况
	// 对比 currentFiber 与 ReactElement（通过 key 进行 diff 对比，此处先省略）
	// 生成 workInProgress FiberNode
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		// 组件的更新阶段
		if (currentFiber !== null) {
			if (currentFiber.key === element.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// key 和 type 都相同，复用旧的 Fiber 节点
						const existing = useFiber(currentFiber, element.props);
						existing.return = returnFiber;
						return existing;
					}
					// key 相同，但 type 不同，删除旧的 Fiber 节点
					deleteChild(returnFiber, currentFiber);
				} else {
					if (__DEV__) {
						console.warn('还未实现的 React 类型', element);
					}
				}
			} else {
				// key 不同，删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber);
			}
		}
		// 根据 DOM 节点创建新的 Fiber 节点
		const fiber = createFiberFromElement(element);
		// 父节点
		fiber.return = returnFiber;
		return fiber;
	}

	// 处理文本节点的情况
	// 对比 currentFiber 与 ReactElement（通过 key 进行 diff 对比，此处先省略）
	// 生成 workInProgress FiberNode
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		// 组件的更新阶段
		if (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				// 复用旧的 Fiber 节点
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				return existing;
			} else {
				// 删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber);
			}
		}
		const fiber = new FiberNode(HostText, { content }, null);
		// 父节点
		fiber.return = returnFiber;
		return fiber;
	}
```

在 `useFiber` 函数中，我们实现了复用旧的 `Fiber` 节点的功能。需要注意的是，对于同一个 `Fiber` 节点，在多次更新中，`current` 和 `workInProgress` 这两个 `Fiber` 节点会被反复重用。

这是因为在 `React` 中，每个 `Fiber` 节点都有一个 `alternate` 指针，指向其在上一次渲染中对应的 `Fiber` 节点。在 `createWorkInProgress` 函数中，我们通过 `current.alternate` 指针获取了上一次渲染中对应的 `Fiber` 节点 `workInProgress`，并且返回了经过处理后的 `workInProgress`，这种重用机制有助于减少内存消耗和提高性能。

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 复用 Fiber 节点
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}
```

在 `deleteChild` 函数中，我们实现了删除旧的 `Fiber` 节点的功能。具体来说，就是将旧的 `Fiber` 节点加入到其父节点的 `deletions` 参数中，并为其父节点增加 `ChildDeletion` `flags` 标记。

`deletions` 参数是一个数组，用于记录需要被删除的节点，然后在适当的时机，`React` 会遍历 `deletions` 数组，执行相应节点的删除操作。

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 从父节点中删除指定的子节点
function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
	if (!shouldTrackSideEffects) {
		return;
	}
	const deletions = returnFiber.deletions;
	if (deletions === null) {
		returnFiber.deletions = [childToDelete];
		returnFiber.flags |= ChildDeletion;
	} else {
		deletions.push(childToDelete);
	}
}
```

## 10-2 处理 completeWork 阶段

在 `completeWork` 阶段，会根据 Fiber 节点的类型（`HostRoot`、`HostComponent`、`HostText` 等）构建 DOM 节点，收集更新 flags，并根据更新 flags 执行不同的 DOM 操作。

之前我们已经实现首屏渲染时的 `completeWork` 函数，现在只需要在其中增加组件更新的情况处理，分别是：

- 处理 `HostComponent` 属性的变化情况。
- 处理 `HostText` 内容的更新情况。

```ts
// weak-react\packages\react-reconciler\src\completeWork.ts

// 生成更新计划，计算和收集更新 flags
export const completeWork = (workInProgress: FiberNode) => {
	const newProps = workInProgress.pendingProps;
	const current = workInProgress.alternate;
	switch (workInProgress.tag) {
		// ...

		case HostComponent:
			if (current !== null && workInProgress.stateNode != null) {
				// 组件的更新阶段
				updateHostComponent(current, workInProgress);
			}
		// ...

		case HostText:
			if (current !== null && workInProgress.stateNode !== null) {
				// 组件的更新阶段
				updateHostText(current, workInProgress);
			}
		// ...
	}
};

function updateHostText(current: FiberNode, workInProgress: FiberNode) {
	const oldText = current.memoizedProps.content;
	const newText = workInProgress.pendingProps.content;
	if (oldText !== newText) {
		markUpdate(workInProgress);
	}
}

function updateHostComponent(current: FiberNode, workInProgress: FiberNode) {
	markUpdate(workInProgress);
}

// 为 Fiber 节点增加 Update flags
function markUpdate(workInProgress: FiberNode) {
	workInProgress.flags |= Update;
}
```

## 10-3 处理 commitWork 阶段

在 `commitWork` 阶段，会深度优先遍历 Fiber 树，递归地向下寻找子节点是否存在需要执行的 flags，而 `commitMutationEffectsOnFiber` 函数会根据每个节点的 flags 和更新计划中的信息执行相应的 DOM 操作。

因此我们需要在 `commitMutationEffectsOnFiber` 函数中增加对 `Update` 和 `ChildDeletion` flags 的处理。

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

// 遍历 Fiber 树，处理 flags
const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach(childToDelete => {
				commitDeletion(childToDelete);
			});
		}
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~ChildDeletion;
	}
};
```

若 Fiber 节点包含 `Update` flags，需要更新相应的 DOM 节点，先只处理节点为 `HostText` 类型的情况：

```ts
// weak-react\packages\react-dom\src\hostConfig.ts

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostComponent:
			// TODO
			break;
		case HostText:
			const text = fiber.memoizedProps.content;
			commitTextUpdate(fiber.stateNode, text);
			break;
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber);
			}
	}
};

export const commitTextUpdate = (textInstance: TextInstance, content: string) => {
	textInstance.textContent = content;
};
```

若 Fiber 节点包含 `ChildDeletion` flags，不仅需要删除该节点及其子树，还需要对子树进行如下处理：

- 对于 `FunctionComponent`，需要处理 `useEffect unmount`，解绑 ref；
- 对于 `HostComponent`，需要解绑 ref；
- 对于子树的「根 `HostComponent`」，需要移除 DOM。

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

// 删除节点及其子树
const commitDeletion = (childToDelete: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Deletion 操作', childToDelete);
	}

	// 子树的根节点
	let rootHostNode: FiberNode | null = null;

	// 递归遍历子树
	commitNestedUnmounts(childToDelete, unmountFiber => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				// TODO 解绑ref
				return;
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				return;
			case FunctionComponent:
				//  TODO useEffect unmount
				return;
			default:
				if (__DEV__) {
					console.warn('未实现的 delete 类型', unmountFiber);
				}
		}
	});

	// 移除 rootHostNode 的DOM
	if (rootHostNode !== null) {
		// 找到待删除子树的根节点的 parent DOM
		const hostParent = getHostParent(childToDelete) as Container;
		removeChild((rootHostNode as FiberNode).stateNode, hostParent);
	}

	childToDelete.return = null;
	childToDelete.child = null;
};

// 深度优先遍历 Fiber 树，执行 onCommitUnmount
const commitNestedUnmounts = (
	root: FiberNode,
	onCommitUnmount: (unmountFiber: FiberNode) => void
) => {
	let node = root;
	while (true) {
		onCommitUnmount(node);

		// 向下遍历，递
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		// 终止条件
		if (node === root) return;

		// 向上遍历，归
		while (node.sibling === null) {
			// 终止条件
			if (node.return === null || node.return === root) return;
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
};
```

```ts
// weak-react\packages\react-dom\src\hostConfig.ts

export const removeChild = (child: Instance | TextInstance, container: Container) => {
	container.removeChild(child);
};
```

## 10-4 处理 useState 方法

之前我们实现了在首屏渲染阶段被调用的 Hooks 集合： `HooksDispatcherOnMount`，现在就来实现组件更新阶段调用的 Hooks 集合 `HooksDispatcherOnUpdate`。

```ts
// weak-react\packages\react-reconciler\src\fiberHooks.ts

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

// update 时的 useState
function updateState<State>(): [State, Dispatch<State>] {
	if (__DEV__) {
		console.log('updateState 开始');
	}
	// 当前正在工作的 useState
	const hook = updateWorkInProgressHook();

	// 计算新 state 的逻辑
	const queue = hook.queue as UpdateQueue<State>;
	const pending = queue.shared.pending;

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(hook.memoizedState, pending);
		hook.memoizedState = memoizedState;
	}
	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

// 更新当前正在工作的 Hook
function updateWorkInProgressHook(): Hook {
	// TODO render 阶段触发的更新
	// 保存链表中的下一个 Hook
	let nextCurrentHook: Hook | null;
	if (currentHook === null) {
		// 这是函数组件 update 时的第一个 hook
		const current = (currentlyRenderingFiber as FiberNode).alternate;
		if (current === null) {
			nextCurrentHook = null;
		} else {
			nextCurrentHook = current.memoizedState;
		}
	} else {
		// 这是函数组件 update 时后续的 hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		throw new Error(`组件 ${currentlyRenderingFiber?.type} 本次执行时的 Hooks 比上次执行多`);
	}

	currentHook = nextCurrentHook as Hook;
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		queue: currentHook.queue,
		next: null
	};
	if (workInProgressHook === null) {
		// update 时的第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		} else {
			// currentlyRenderingFiber == null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error('Hooks 只能在函数组件中执行');
		}
	} else {
		// update 时的其他 hook
		// 将当前处理的 Hook.next 指向新建的 hook，形成 Hooks 链表
		workInProgressHook.next = newHook;
		// 更新当前处理的 Hook
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}
```

---

至此，我们就实现了单节点的更新流程。

相关代码可在 `git tag weak-react-v1.10` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.10
