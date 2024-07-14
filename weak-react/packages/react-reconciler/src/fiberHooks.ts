import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

// 当前正在处理的 FiberNode
let currentlyRenderingFiber: FiberNode | null = null;
// Hooks 链表中当前正在处理的 Hook
let workInProgressHook: Hook | null = null;
// 当前使用的 Hooks 指针，根据初始渲染/更新渲染阶段不同进行赋值
const { currentDispatcher } = internals;

// 定义 Hook 数据结构
export interface Hook {
	memoizedState: any; // 保存 Hook 的数据
	queue: any;
	next: Hook | null;
}

// 执行函数组件中的函数
export function renderWithHooks(workInProgress: FiberNode) {
	// 赋值
	currentlyRenderingFiber = workInProgress;
	workInProgress.memoizedState = null;

	// 判断 Hooks 被调用的时机
	const current = workInProgress.alternate;
	if (current !== null) {
		// 组件的更新阶段(update)
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// 首屏渲染阶段(mount)
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	// 函数保存在 type 字段中
	const Component = workInProgress.type;
	const props = workInProgress.pendingProps;
	// 执行函数
	const children = Component(props);

	// 重置全局变量
	currentlyRenderingFiber = null;
	workInProgressHook = null;

	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

// 获取当前正在工作的 Hook
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		queue: null,
		next: null
	};
	if (workInProgressHook === null) {
		// mount 时的第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		} else {
			// currentlyRenderingFiber === null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error('Hooks 只能在函数组件中执行');
		}
	} else {
		// mount 时的其他 hook
		// 将当前工作的 Hook 的 next 指向新建的 hook，形成 Hooks 链表
		workInProgressHook.next = hook;
		// 更新当前工作的 Hook
		workInProgressHook = hook;
	}
	return workInProgressHook;
}

// mount 时的 useState
function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 当前正在工作的 useState
	const hook = mountWorkInProgressHook();

	// 当前 useState 对应的 Hook 数据
	// 两种情况：
	// const [data, setData] = useState(0);
	// or
	// const [data, setData] = useState(0data) => data + 1);
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memoizedState = memoizedState;

	// 创建 UpdateQueue 实例（此时 UpdateQueue 数据结构要包含 dispatch 这个字段）
	const queue = createUpdateQueue<State>();
	hook.queue = queue;

	// @ts-ignore
	// 实现 dispatch
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

// 用于触发状态更新的逻辑
function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	// 创建 Update 实例
	const update = createUpdate(action);
	// 将 Update 添加到 UpdateQueue 中
	enqueueUpdate(updateQueue, update);
	// 调度更新
	scheduleUpdateOnFiber(fiber);
}

function updateState<T>(initialState: T | (() => T)): [T, Dispatch<T>] {
	// TODO
	throw new Error('Function not implemented.');
}
