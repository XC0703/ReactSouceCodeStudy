## 13-1 Diff 算法支持 Fragment

Fragment 是一种特殊的组件，用于在不引入额外 DOM 元素的情况下，包裹多个子元素。使用 Fragment 可以让组件结构更加清晰，而不引入不必要的父级 DOM 节点，以免影响页面布局和性能。主要分为以下三种情况：

- Fragment 包裹其他组件
- Fragment 与其他组件同级
- 数组形式的 Fragment

### 13-1-1 Fragment 包裹其他组件

```tsx
// ReactElement
const element = (
	<>
		<div>1</div>
		<div>2</div>
	</>
);

// 对应Dom
<div>1</div>
<div>2</div>

// JSX 转换结果
var element = jsxs(Fragment, {
    children: [
        jsx("div", {children: "1"})
        jsx("div", {children: "2"})
    ]
})
```

其中，`<></>` 是 Fragment 的简写，完整的写法是 `<React.Fragment>`。可以看到，在上面的例子中，`element` 是一个 `type` 为 Fragment 的 `ReactElement`，因此，在 Diff 算法中，需要考虑单一节点为 Fragment 的情况。

先在 `ReactSymbols.ts` 文件中定义一下 `REACT_FRAGMENT_TYPE`，表示 Fragment 组件：

```ts
// weak-react\packages\shared\ReactSymbols.ts

// 表示 Fragment 组件，即 <React.Fragment> 或短语法 <></> 创建的 Fragment
export const REACT_FRAGMENT_TYPE = supportSymbol ? Symbol.for('react.fragment') : 0xeacb;
```

接着在 `reconcileChildFibers` 函数中增加对顶层无 key 的 Fragment 情况的处理，以下是代码的主要逻辑：

**1. 判断是否为顶层的无 key 的 Fragment：**

- 如果 `newChild` 是对象，且不为 `null`，且为顶层的 Fragment，且其 key 为 `null`，则为顶层的无 key 的 Fragment；
- 处理方法是将 `newChild` 重新赋值为 Fragment 的 `props.children`；

**2. 判断当前 Fiber 的类型：**

- 如果 `newChild` 是 ReactElement 节点，则进一步判断其类型；
  - 如果 `newChild` 是数组，说明存在多个子节点，调用 `reconcileChildrenArray` 处理多节点的 Diff 逻辑。
  - 如果 `newChild` 是单个 React 元素节点，调用 `reconcileSingleElement` 处理单节点的 Diff 逻辑。
- 如果 `newChild` 是文本节点，则保持原逻辑，不用修改；

```ts
// weak-react\packages\react-reconciler\src\childFiber.ts

// 闭包，根据 shouldTrackSideEffects 返回不同 reconcileChildFibers 的实现
return function reconcileChildFibers(
	returnFiber: FiberNode,
	currentFiber: FiberNode | null,
	newChild?: any
) {
	// 判断 Fragment
	const isUnkeyedTopLevelFragment =
		typeof newChild === 'object' &&
		newChild !== null &&
		newChild.type === REACT_FRAGMENT_TYPE &&
		newChild.key === null;
	if (isUnkeyedTopLevelFragment) {
		newChild = newChild.props.children;
	}

	// 判断当前 fiber 的类型
	// 单个 Element 节点
	if (typeof newChild === 'object' && newChild !== null) {
		// 处理多个 ReactElement 节点的情况
		if (Array.isArray(newChild)) {
			return reconcileChildrenArray(returnFiber, currentFiber, newChild);
		}

		switch (newChild.$$typeof) {
			// 表示普通的 React 元素，即通过 JSX 创建的组件或 DOM 元素
			case REACT_ELEMENT_TYPE:
				return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
			default:
				if (__DEV__) {
					console.warn('未实现的 reconcile 类型', newChild);
				}
				break;
		}
	}

	// ...
};
```

### 13-1-2 Fragment 与其他组件同级

```tsx
// ReactElement
const element = (
	<ul>
		<>
			<li>1</li>
			<li>2</li>
		</>
		<li>3</li>
		<li>4</li>
	</ul>
);


// 对应Dom
<ul>
	<li>1</li>
	<li>2</li>
	<li>3</li>
	<li>4</li>
</ul>

// JSX 转换结果
var element = jsxs("ul", {
    children: [
        jsxs(Fragment, {
            children: [
                jsx("li", {children: "1"})
                jsx("li", {children: "2"})
            ]
        }),
        jsx("li", {children: "3"})
        jsx("li", {children: "4"})
    ]
})
```

这种情况中，若 `newChild.children` 为单个 Fragment 节点，则需要进入 `reconcileSingleElement` 方法进行处理；若 `newChild.children` 为数组类型，数组中的某一项为 Fragment，与其他组件同级，则需要进入 `reconcileChildrenArray` 方法进行处理。
我们先在 `reconcileSingleElement` 函数中增加对 Fragment 组件的处理：

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
					// 处理 Fragment 的情况
					let props: Props = element.props;
					if (element.type === REACT_FRAGMENT_TYPE) {
						props = element.props.children;
					}
					const existing = useFiber(currentFiber, props);
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
	let fiber;
	if (element.type === REACT_FRAGMENT_TYPE) {
		fiber = createFiberFromFragment(element.props.children, element.key);
	} else {
		fiber = createFiberFromElement(element);
	}
	// 父节点
	fiber.return = returnFiber;
	return fiber;
}
```

如果可以复用旧的 Fiber 节点，对于 Fragment 类型的节点来说，需要将 `element.props.children` 作为 `props` 参数传给旧节点；

如果不能复用，对于 Fragment 类型的节点来说，则需要调用 `createFiberFromFragment` 函数，来创建新的 Fragment 类型的 Fiber 节点：

```ts
// weak-react\packages\react-reconciler\src\fiber.ts

// 根据 Fragment 创建新的 Fiber 节点
export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
```

接着我们来处理多节点 Diff 的情况，`reconcileChildrenArray` 方法调用了 `updateFromMap` 函数来遍历 `newChild` 数组，判断是否可复用，我们需要在其中增加逻辑，判断是否复用或者新建 Fragment：

如果 `element.type === REACT_FRAGMENT_TYPE`，当前节点为 Fragment 类型，调用 `updateFragment` 函数，判断旧节点中是否有 Fragment 类型的节点，若没有就新建一个 Fragment 节点，有的话就直接复用旧节点。

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

	// ...

	// HostComponent
	if (typeof element === 'object' && element !== null) {
		switch (element.$$typeof) {
			case REACT_ELEMENT_TYPE:
				if (element.type === REACT_FRAGMENT_TYPE) {
					return updateFragment(returnFiber, before, element, keyToUse, existingChildren);
				}
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

// 复用或新建 Fragment
function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber;
	if (!current || current.tag !== Fragment) {
		fiber = createFiberFromFragment(elements, key);
	} else {
		existingChildren.delete(key);
		fiber = useFiber(current, elements);
	}
	fiber.return = returnFiber;
	return fiber;
}
```

### 13-1-3 数组形式的 Fragment

```tsx
// ReactElement
const arr = [<li>1</li>, <li>2</li>];

const element = (
	<ul>
		{arr}
		<li>3</li>
		<li>4</li>
	</ul>
);

// 对应Dom
<ul>
	<li>1</li>
	<li>2</li>
	<li>3</li>
	<li>4</li>
</ul>

// JSX 转换结果
var arr = [
    jsx("li", {children: "1"}),
    jsx("li", {children: "2"})
]

var element = jsxs("ul", {
    children: [
        arr,
        jsx("li", {children: "3"})
        jsx("li", {children: "4"})
    ]
})
```

这种情况中，`newChild.children` 是一个数组，数组中的某一项也是一个数组。由于 `newChild.children` 是数组，所以会进入 `reconcileChildrenArray` 函数进行处理，因此我们需要在其中增加数组类型的判断，看是否可以复用 Fragment 类型的 Fiber 节点，逻辑和上面一样：

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

	// ...

	// 数组类型的 ReactElement，如：<ul>{[<li/>, <li/>]}</ul>
	if (Array.isArray(element)) {
		return updateFragment(returnFiber, before, element, keyToUse, existingChildren);
	}
	return null;
}
```

## 13-2 处理 Reconciliation 阶段

为了将 Fragment 类型的节点加入到 Reconciliation 阶段的更新和 Diff 流程中，我们需要在 `beginWork` 和 `completeWork` 两个函数加入对 Fragment 类型节点的处理逻辑。

### 13-2-1 处理 beginWork

在 `beginWork` 函数中，我们需要增加对 Fragment 类型节点的处理：

```ts
// weak-react\packages\react-reconciler\src\beginWork.ts

// 比较并返回子 FiberNode
export const beginWork = (workInProgress: FiberNode) => {
	switch (workInProgress.tag) {
		// ...
		// 表示Fragment节点
		case Fragment:
			return updateFragment(workInProgress);
		// ...
	}
};

function updateFragment(workInProgress: FiberNode) {
	const nextChildren = workInProgress.pendingProps;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}
```

### 13-2-2 处理 completeWork

在 `completeWork` 函数中，我们也需要增加对 Fragment 类型节点的处理，向上冒泡收集到的更新 flags:

```ts
// weak-react\packages\react-reconciler\src\completeWork.ts

// 生成更新计划，计算和收集更新 flags
export const completeWork = (workInProgress: FiberNode) => {
	const newProps = workInProgress.pendingProps;
	const current = workInProgress.alternate;
	switch (workInProgress.tag) {
		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(workInProgress);
			return null;

		// ...
	}
};
```

## 13-3 处理 Commit 阶段

增加了 Fragment 组件之后，在 Commit 阶段也需要做一些边界情况处理。例如删除节点时，需要考虑到 Fragment 组件可能会包含多个子节点，因此在删除节点时需要遍历处理其子节点。

`commitDeletion` 函数负责在协调过程中删除 Fiber 节点及其关联子树的操作，下面我们就来改造 `commitDeletion` 函数：

- **初始化：**

  - 函数接受一个名为 `childToDelete` 的参数，表示要删除的子树的根节点。
  - 初始化一个数组 `rootChildrenToDelete` 用于跟踪需要移除的子树中的 Fiber 节点。

- **递归遍历：**

  - 调用 `commitNestedUnmounts` 函数，深度优先遍历 Fiber 树，执行 `onCommitUnmount`。
  - 在 `commitNestedUnmounts` 的回调函数中，调用 `recordChildrenToDelete` 函数，遍历所有兄弟节点，记录待删除的节点。

- **遍历删除：**

  - 遍历 `rootChildrenToDelete`，找到待删除子树的根节点的父级 DOM（`hostParent`），并通过 `removeChild` 移除每个节点的 DOM。

- **清理关联：**
  - 将 `childToDelete` 的 `return` 和 `child` 属性置为 `null`，断开与父节点和子节点的关联。

```ts
// weak-react\packages\react-reconciler\src\commitWork.ts

// 删除节点及其子树
const commitDeletion = (childToDelete: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Deletion 操作', childToDelete);
	}

	// 子树的根节点
	const rootChildrenToDelete: FiberNode[] = [];

	// 递归遍历子树
	commitNestedUnmounts(childToDelete, unmountFiber => {
		switch (unmountFiber.tag) {
			case HostComponent:
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber);
				// TODO 解绑ref
				return;
			case HostText:
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber);
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

	// 移除 rootChildrenToDelete 的DOM
	if (rootChildrenToDelete.length !== 0) {
		// 找到待删除子树的根节点的 parent DOM
		const hostParent = getHostParent(childToDelete) as Container;
		rootChildrenToDelete.forEach(node => {
			removeChild(node.stateNode, hostParent);
		});
	}

	childToDelete.return = null;
	childToDelete.child = null;
};

// 记录需要删除的子节点
const recordChildrenToDelete = (childrenToDelete: FiberNode[], unmountFiber: FiberNode) => {
	const lastOne = childrenToDelete[childrenToDelete.length - 1];
	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
};
```

## 13-4 处理 React 导出

因为我们使用 Fragment 组件时，是从 `react` 包引入的，如：`import { Fragment } from 'react';` 或直接使用 `<React.Fragment>` 标签，因此还需要在 react 包中导出 Fragment 组件。

在 `jsx.ts` 中导出 Fragment：

```ts
// weak-react\packages\react\src\jsx.ts

import { REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
export const Fragment = REACT_FRAGMENT_TYPE;
```

在 `jsx-dev-runtime.ts` 导出 Fragment：

```ts
// weak-react\packages\react\jsx-dev-runtime.ts

export { jsxDEV, Fragment } from './src/jsx';
```

---

至此，我们就实现了 Fragment，并将 Fragment 类型的组件加入到了 React 更新流程中。

相关代码可在 `git tag weak-react-v1.13` 查看，地址：https://github.com/XC0703/ReactSouceCodeStudy/tree/weak-react-v1.13
