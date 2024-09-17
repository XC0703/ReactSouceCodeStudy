import { Action } from 'shared/ReactTypes';

// const [data, setData] = useState(0);
// or
// const [data, setData] = useState(0data) => data + 1);
export interface Dispatcher {
	useState: <S>(initialState: (() => S) | S) => [S, Dispatch<S>];
	useEffect: (callback: () => void | void, deps: any[] | void) => void;
}

export type Dispatch<State> = (action: Action<State>) => void;

// 当前使用的 Hooks 指针
const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

// 查询当前使用的 Hooks 集合
export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	// 说明当前代码执行的上下文不是在函数组件或自定义Hooks中，因为只有在这些上下文中，currentDispatcher才会被设置为非null的Dispatcher实例。
	if (dispatcher === null) {
		throw new Error('Hooks 只能在函数组件中执行');
	}
	return dispatcher;
};

export default currentDispatcher;
