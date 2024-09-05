## 12-1 Diff 算法简介

React 的 Diff 算法用于比较虚拟 DOM 树的不同版本，并计算出最小的更新操作，以减少实际 DOM 操作的数量。它的核心思想是尽量复用已有的 DOM 节点，而不是直接重新创建整个 DOM 树，以减少不必要的 DOM 操作，提高性能，确保只有必要的部分被更新。

以下是 React Diff 算法的主要步骤：

1. **树的遍历：** React 会同时遍历新旧两棵树的节点，对比它们的差异。遍历过程是深度优先的，从根节点开始递归。

2. **节点比较：** 对比新旧节点，首先比较节点类型，如果类型不同，则认为这两个节点是不同的，需要进行替换。如果类型相同，则进一步比较节点的属性（例如，className、style 等）以及子节点。

3. **子节点递归：** 如果节点类型相同，React 会递归比较子节点。这里采用的是 Diff 算法的核心策略，即同层比较，而不进行跨层比较。

4. **列表节点的处理：** 当处理列表时，React 会给列表中的每个子节点分配一个唯一的 key 值。这样在更新时，React 可以通过 key 值快速定位到相应的节点，提高对比效率。

5. **差异记录：** 在比较的过程中，React 会记录下需要进行的更新操作，包括插入、更新、移动和删除等，这些操作被称为差异（diff）。

6. **差异合并：** 最后，React 将所有的差异合并成一个更新队列，然后批量执行这些更新，最终反映在实际的 DOM 操作上。

`reconcileChildren`（协调子节点）函数是 Diff 算法的核心，它递归地比较和更新新旧子节点，决定是否需要对子节点进行插入、更新、移动或删除的操作。在其内部，还会调用 `reconcileSingleElement`、`reconcileChildrenArray` 等函数来处理具体的更新操作。

## 12-2 实现单节点 Diff

单节点的 Diff 算法是指组件更新后是单节点，可能有以下几种情况（其中 `ABC` 代表组件的 `type`，`123` 代表组件的 `key`）：

- `A1 -> A1`：`type` 和 `key` 都相同，可复用；
- `A1 -> A2`：`type` 相同，`key` 不同，不可复用；
- `A1 -> B1`：`type` 不同，`key` 相同，不可复用；
- `A1B2C3 -> A1`：其中一个节点的 `type` 和 `key` 都相同，可复用该节点，删除其他兄弟节点；
- `A1B2C3 -> B1`：`type` 不同，`key` 不同，不可复用；

其逻辑主要在 `reconcileSingleElement` 和 `reconcileSingleTextNode` 函数中实现，在[第 10 节](./10、实现单节点%20update.md)中，我们已经实现了这两个函数的基础情况（`A1 -> A1`、`A1 -> A2`、`A1 -> B1`），现在只需要稍加改造，增加多节点变单节点情况的判断，遍历并处理所有兄弟节点：

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 处理单个 Element 节点的情况
// 对比 currentFiber 与 ReactElement（通过 key 进行 diff 对比）
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
					// 剩下的兄弟节点标记删除
					deleteRemainingChildren(returnFiber, currentFiber.sibling);
					return existing;
				}
				// key 相同，但 type 不同，删除所有旧的 Fiber 节点
				deleteRemainingChildren(returnFiber, currentFiber);
			} else {
				if (__DEV__) {
					console.warn('还未实现的 React 类型', element);
				}
			}
		} else {
			// key 不同，删除当前旧的 Fiber 节点，继续遍历兄弟节点
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
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
			deleteRemainingChildren(returnFiber, currentFiber.sibling);
			return existing;
		} else {
			// 删除旧的 Fiber 节点
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}
	}
	const fiber = new FiberNode(HostText, { content }, null);
	// 父节点
	fiber.return = returnFiber;
	return fiber;
}
```

其中 `deleteRemainingChildren` 函数用于删除当前节点的所有兄弟节点：

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 删除当前节点的所有兄弟节点
function deleteRemainingChildren(
	returnFiber: FiberNode,
	currentFirstChild: FiberNode | null
): void {
	if (!shouldTrackSideEffects) return;
	let childToDelete = currentFirstChild;
	while (childToDelete !== null) {
		deleteChild(returnFiber, childToDelete);
		childToDelete = childToDelete.sibling;
	}
}
```

## 12-3 实现多节点 Diff

同级多节点的 Diff 算法是指组件更新后有多个节点，`newChild` 是一个节点数组。多节点 Diff 和 单节点 Diff 的区别是：对于单节点 Diff，主要需要执行 **插入 Placement** 和 **删除 ChildDeletion** 操作，而对于多节点 Diff，则多了 **移动 Placement** 操作。

以下是多节点 Diff 算法的主要流程：

**1. 保存同级节点信息：**

- 创建一个 Map（`existingChildren`），将 `current` 中所有同级 Fiber 节点保存在 Map 中。Key 值为节点的 key 或者节点在兄弟节点中的位置索引。这个 Map 用于后续判断新节点是否可复用以及标记删除操作；
- 通过使用 Map 数据结构，避免了在每一轮循环中进行线性搜索，提高了复用性能。

**2. 遍历新节点数组，判断是否可复用：**

- 遍历新节点数组，对于每个新节点，调用 `updateFromMap` 函数判断是否可以复用现有的 Fiber 节点，或者需要创建新的 Fiber 节点。

**3. 标记插入或移动操作：**

- 对于可复用的新节点，标记其索引为当前位置，将其 `return` 指针指向当前组件的父节点；
- 如果不需要追踪副作用（`shouldTrackSideEffects` 为 `false`），直接继续遍历下一个节点；
- 如果需要追踪副作用，检查当前节点是首屏渲染阶段还是组件更新阶段，若是组件更新阶段，比较其索引是否小于 `lastPlacedIndex`，若小于，标记为移动操作；否则，不用移动；
- 如果是首屏渲染阶段，标记为插入操作。

**4. 标记删除操作：**

- 遍历 Map 中剩余的未匹配的 `current Fiber` 节点，执行删除操作，确保删除不再需要的节点。

代码实现如下：

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

type ExistingChildren = Map<string | number, FiberNode>;

// 协调新旧子元素数组差异
function reconcileChildrenArray(
	returnFiber: FiberNode,
	currentFirstChild: FiberNode | null,
	newChild: any[]
) {
	// 最后一个可复用 Fiber 在 current 中的 index
	let lastPlacedIndex: number = 0;
	// 创建的第一个新 Fiber
	let firstNewFiber: FiberNode | null = null;
	// 创建的最后一个新 Fiber
	let lastNewFiber: FiberNode | null = null;

	// 1. 将 current 中所有同级 Fiber 节点保存在 Map 中
	const existingChildren: ExistingChildren = new Map();
	let current = currentFirstChild;
	while (current !== null) {
		const keyToUse = current.key !== null ? current.key : current.index.toString();
		existingChildren.set(keyToUse, current);
		current = current.sibling;
	}

	// 2. 遍历 newChild 数组，判断是否可复用
	for (let i = 0; i < newChild.length; i++) {
		const after = newChild[i];
		const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

		if (newFiber === null) {
			continue;
		}

		// 3. 标记插入或移动
		newFiber.index = i;
		newFiber.return = returnFiber;

		if (lastNewFiber === null) {
			lastNewFiber = newFiber;
			firstNewFiber = newFiber;
		} else {
			lastNewFiber.sibling = newFiber;
			lastNewFiber = lastNewFiber.sibling;
		}

		if (!shouldTrackSideEffects) {
			continue;
		}

		const current = newFiber.alternate;
		if (current !== null) {
			const oldIndex = current.index;
			if (oldIndex < lastPlacedIndex) {
				// 标记移动
				newFiber.flags |= Placement;
				continue;
			} else {
				// 不移动
				lastPlacedIndex = oldIndex;
			}
		} else {
			// 首屏渲染阶段，标记插入
			newFiber.flags |= Placement;
		}
	}

	// 4. 将 Map 中剩下的标记为删除
	existingChildren.forEach(fiber => {
		deleteChild(returnFiber, fiber);
	});

	return firstNewFiber;
}
```

在遍历新节点数组时，调用了 `updateFromMap` 函数来更新 Fiber 树中的子节点，根据新的元素（`element`）与已有的子节点映射（`existingChildren`）进行比较，判断是否可以复用现有的 Fiber 节点，或者需要创建新的 Fiber 节点。主要的实现思路如下：

**1. 处理 HostText（文本节点）：**

- 如果元素是字符串或数字，表示是文本节点。
- 尝试从已有子节点映射中找到相同 key 的节点。
- 如果找到并且节点是文本节点，可以复用旧的 Fiber 节点；否则，创建一个新的文本节点的 Fiber 节点。

**2. 处理 HostComponent（普通 DOM 节点）：**

- 如果元素是对象且不为 `null`，判断其 `$$typeof` 属性。
- 如果 `$$typeof` 是 `REACT_ELEMENT_TYPE`，表示是 React 元素。
- 尝试从已有子节点映射中找到相同 key 的节点。
- 如果找到并且节点类型相同，可以复用旧的 Fiber 节点，更新其属性；否则，根据元素创建新的 Fiber 节点。

**3. 其他情况的处理：**

- 对于其他类型的元素，例如数组类型（`REACT_FRAGMENT_TYPE`）或尚未实现的情况，可以进行相应的处理或者输出警告信息。
- 最后返回复用的或新创建的 Fiber 节点，如果无法处理当前元素类型，返回 `null`。

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 根据当前 Fiber 节点和新的子元素创建或复用 Fiber 节点
function updateFromMap(
	returnFiber: FiberNode,
	existingChildren: ExistingChildren,
	index: number,
	element: any
): FiberNode | null {
	const keyToUse = element.key !== null ? element.key : index.toString();
	const before = existingChildren.get(keyToUse);

	// HostText
	if (typeof element === 'string' || typeof element === 'number') {
		// 可复用，复用旧的 Fiber 节点
		if (before && before.tag === HostText) {
			existingChildren.delete(keyToUse);
			return useFiber(before, { content: element + '' });
		}
		// 不可复用，创建新的 Fiber 节点
		return new FiberNode(HostText, { content: element + '' }, null);
	}

	// HostComponent
	if (typeof element === 'object' && element !== null) {
		switch (element.$$typeof) {
			case REACT_ELEMENT_TYPE:
				// 可复用，复用旧的 Fiber 节点
				if (before && before.type === element.type) {
					existingChildren.delete(keyToUse);
					return useFiber(before, element.props);
				}
				// 不可复用，创建新的 Fiber 节点
				return createFiberFromElement(element);

			// TODO case REACT_FRAGMENT_TYPE
			default:
				break;
		}
	}

	// TODO 数组类型的element，如：<ul>{[<li/>, <li/>]}</ul>
	if (Array.isArray(element) && __DEV__) {
		console.warn('还未实现数组类型的child', element);
	}
	return null;
}
```

## 12-4 处理 commit 阶段

刚刚我们在为节点标记移动和插入 flags 时，标记的都是 `Placement`，对于插入操作，之前对应的 DOM 方法是 `parentNode.appendChild`，现在为了实现移动操作，还需要支持 `parentNode.insertBefore`。

`parentNode.insertBefore` 需要找到「目标兄弟 Host 节点」，也就是在哪个兄弟节点前插入，主要考虑两个因素：

- **不稳定的 Host 节点不能作为目标兄弟 Host 节点：** 在 React 中，如果一个 Host 节点标记有 `Placement` 标记，表示它是一个不稳定的节点，不适合作为目标兄弟节点。所以需要在寻找兄弟节点的过程中，排除这些不稳定的节点。

- **兄弟 Host 节点可能并不是目标 Fiber 节点的直接兄弟节点：** 以下面两种情况为例：

```ts
// 情况一：B 是函数组件，A 的兄弟 Host 节点是 B 的 child 节点，即 <div />
<A /><B />
function B(){
	return <div />
}

// 情况二：A 的兄弟 Host 节点是 A 的父节点的兄弟节点，即 <div />
<App /><div />
function App(){
	return <A />
}
```

下面我们就来实现 `getHostSibling` 函数，获取给定 Fiber 节点的目标兄弟 Host 节点，从而支持 `parentNode.insertBefore` 操作。

通过向上和向下遍历 Fiber 树，找到目标节点的直接兄弟节点或者父节点的兄弟节点。在遍历过程中，需要处理以下情况：

- 向上遍历：如果当前节点没有兄弟节点，就向上遍历到父节点，直到找到有兄弟节点的节点或者到达根节点。
- 向下遍历：如果当前节点的兄弟节点不是 Host 节点或者文本节点，就继续向下遍历找到一个 Host 节点或者文本节点，作为目标兄弟节点。

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

// 获取兄弟 Host 节点
const getHostSibling = (fiber: FiberNode) => {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		// 没有兄弟节点时，向上遍历
		while (node.sibling === null) {
			const parent = node.return;
			if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
				return null;
			}
			node = parent;
		}

		// 向下遍历
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostText && node.tag !== HostComponent) {
			// 不稳定的 Host 节点不能作为目标兄弟 Host 节点
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}

		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
};
```

找到目标兄弟 Host 节点之后，我们就可以在 `commitPlacement` 函数中执行移动该 DOM 节点操作：

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Placement 操作', finishedWork);
	}
	// parent DOM
	const hostParent = getHostParent(finishedWork);
	// Host sibling
	const sibling = getHostSibling(finishedWork);
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
	}
};

// 遍历子节点，将子节点的 DOM 插入到 parent DOM 中（递归插入）
const appendPlacementNodeIntoContainer = (
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) => {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			// 执行移动操作
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			// 执行插入操作
			appendChildToContainer(finishedWork.stateNode, hostParent);
		}
	} else {
		// ...
	}
};
```

移动 DOM 节点的函数我们在 `hostConfig.ts` 中实现，就是将待移动的节点插入到我们找到的目标兄弟 Host 节点前面：

```ts
// weak-react\packages\react-dom\src\hostConfig.ts

export const insertChildToContainer = (child: Instance, container: Container, before: Instance) => {
	container.insertBefore(child, before);
};
```

---

至此，我们就实现了单节点和多节点的 Diff 算法，但节点为 `Fragment` 和嵌套数组的情况暂未支持，下一节我们就来实现 `Fragment`，使得 Diff 算法更完备。

相关代码可在 `git tag weak-react-v1.12` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.12
