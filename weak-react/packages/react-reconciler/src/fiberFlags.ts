export type Flags = number;

export const NoFlags = 0b0000000; // 0，表示没有任何副作用
export const PerformedWork = 0b0000001; // 1，表示执行过更新
export const Placement = 0b0000010; // 2，表示节点被插入
export const Update = 0b0000100; // 4，表示节点被更新
export const ChildDeletion = 0b0001000; // 8，表示子节点被删除
