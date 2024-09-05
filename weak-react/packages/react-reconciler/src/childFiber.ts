// packages/react-reconciler/src/childFiber.ts
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './fiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackSideEffects: boolean) {
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

	// 为 Fiber 节点添加更新 flags
	function placeSingleChild(fiber: FiberNode) {
		// 首屏渲染且追踪副作用时，才添加更新 flags
		if (shouldTrackSideEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	// 复用 Fiber 节点
	function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
		const clone = createWorkInProgress(fiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		return clone;
	}

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
			const keyToUse =
				current.key !== null ? current.key : current.index.toString();
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
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});

		return firstNewFiber;
	}

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

	// 闭包，根据 shouldTrackSideEffects 返回不同 reconcileChildFibers 的实现
	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前 fiber 的类型
		// 单个 Element 节点
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				// 表示普通的 React 元素，即通过 JSX 创建的组件或 DOM 元素
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的 reconcile 类型', newChild);
					}
					break;
			}
		}

		// 多个 Element 节点
		if (Array.isArray(newChild)) {
			return reconcileChildrenArray(returnFiber, currentFiber, newChild);
		}

		// 文本节点
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (__DEV__) {
			console.warn('未实现的 reconcile 类型', newChild);
		}
		return null;
	};
}

// 组件的更新阶段中，追踪副作用
export const reconcileChildFibers = ChildReconciler(true);

// 首屏渲染阶段中不追踪副作用，只对根节点执行一次 DOM 插入操作
export const mountChildFibers = ChildReconciler(false);
