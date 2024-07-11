export type Container = any;

// 模拟实现构建 DOM 的函数
// 真实函数要在不同的宿主环境中实现
export const createInstance = (...args: any) => {
	return {} as any;
};

export const appendInitialChild = (...args: any) => {
	return {} as any;
};

export const createTextInstance = (...args: any) => {
	return {} as any;
};

export const appendChildToContainer = (child: any, parent: Container) => {
	const prevParentID = child.parent;

	if (prevParentID !== -1 && prevParentID !== parent.rootID) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parent.rootID;
	parent.children.push(child);
};
