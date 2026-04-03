import { ConsoleLoading } from "@/components/console-loading";

export default function ConsoleLoadingPage() {
  return (
    <ConsoleLoading
      title="운영 화면을 불러오는 중입니다"
      description="회사 선택, 실행 상태, 결과 파일을 차례대로 확인하고 있습니다."
    />
  );
}
