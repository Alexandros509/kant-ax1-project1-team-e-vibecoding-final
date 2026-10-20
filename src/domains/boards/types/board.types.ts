// 멀티 게시판 분기 및 권한 처리를 위한 인터페이스
export type BoardWriteRole = 'all' | 'user' | 'admin';

export interface BoardSetting {
    id: string; // notice, qna, review 등
    name: string;
    description: string;
    write_role: BoardWriteRole;
    created_at: string;
}
