import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLanes } from './fiberLanes';

export function createContainer(container: Container) {
	// 创建一个新的 `FiberNode` 对象，该对象表示根节点。
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	// 创建一个新的 `FiberRootNode` 对象，该对象用于管理整个 `React` 应用的状态和更新。
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	// 获取根节点的 current 属性，该属性表示当前正在渲染的 Fiber 节点
	const hostRootFiber = root.current;
	const lane = requestUpdateLanes();
	// 创建一个 Update 对象，用于存储新的 React 元素
	const update = createUpdate<ReactElementType | null>(element, lane);
	// 将 Update 添加到 UpdateQueue 中
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);
	// 协调更新
	scheduleUpdateOnFiber(hostRootFiber);
	return element;
}
