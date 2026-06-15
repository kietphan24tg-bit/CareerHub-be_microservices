export declare const COMMUNICATION_GRPC_PACKAGE_NAME = "careerhub.communication.v1";
export declare const COMMUNICATION_GRPC_SERVICE_NAME = "CommunicationService";
export type NotificationMessage = {
    created_at: string;
    id: string;
    identity_id: string;
    message: string;
    metadata_json: string;
    read_at: string;
    title: string;
    type: string;
};
export type CreateNotificationRequest = {
    identity_id: string;
    message: string;
    metadata_json?: string;
    request_id?: string;
    title: string;
    type: string;
};
export type CreateNotificationResponse = {
    notification: NotificationMessage;
};
export type ListNotificationsRequest = {
    identity_id: string;
    request_id?: string;
};
export type ListNotificationsResponse = {
    notifications: NotificationMessage[];
    unread_count: number;
};
export type GetNotificationRequest = {
    identity_id: string;
    notification_id: string;
    request_id?: string;
};
export type GetNotificationResponse = {
    notification: NotificationMessage;
};
export type MarkNotificationReadRequest = {
    identity_id: string;
    notification_id: string;
    request_id?: string;
};
export type MarkNotificationReadResponse = {
    notification: NotificationMessage;
};
export type MarkAllNotificationsReadRequest = {
    identity_id: string;
    request_id?: string;
};
export type MarkAllNotificationsReadResponse = {
    updated_count: number;
};
