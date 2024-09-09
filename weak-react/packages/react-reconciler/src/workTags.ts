export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment;

export const FunctionComponent = 0; // 函数式组件
export const HostRoot = 3; // 应用在宿主环境挂载的根节点
export const HostComponent = 5; // 宿主组件
export const HostText = 6; // 文本节点
export const Fragment = 7; // Fragment 组件
