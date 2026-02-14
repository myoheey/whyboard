import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              PinCanvas
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold">개인정보처리방침</h2>
          <p className="text-muted-foreground mt-2">시행일: 2025년 2월 11일</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PinCanvas 개인정보처리방침</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm">
              <p className="text-muted-foreground">
                PinCanvas(이하 "서비스")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와
                관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.
              </p>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">1. 수집하는 개인정보 항목</h4>
                <p className="text-muted-foreground mb-2">
                  PinCanvas는 서비스 제공을 위해 최소한의 개인정보만을 수집합니다.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>
                    <strong>필수 항목:</strong> 이메일 주소, 비밀번호 (암호화 저장), 생년월일
                  </li>
                  <li>
                    <strong>선택 항목:</strong> 이름, 프로필 이미지
                  </li>
                  <li>
                    <strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그
                  </li>
                </ul>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">2. 개인정보의 수집 및 이용 목적</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>회원 가입 및 관리: 회원 식별, 가입 의사 확인, 연령 확인 (만 14세 이상)</li>
                  <li>서비스 제공: 캔버스 생성/편집, 공유 기능 제공</li>
                  <li>고객 지원: 문의 응대, 서비스 관련 안내</li>
                  <li>서비스 개선: 이용 통계 분석, 기능 개선</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">3. 개인정보의 보유 및 이용 기간</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>
                    <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 지체없이 파기)
                  </li>
                  <li>
                    <strong>서비스 이용 기록:</strong> 3년 (전자상거래법)
                  </li>
                  <li>
                    <strong>접속 로그:</strong> 3개월 (통신비밀보호법)
                  </li>
                </ul>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">4. 개인정보의 안전성 확보 조치</h4>
                <p className="text-muted-foreground mb-2">
                  PinCanvas는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>비밀번호의 암호화 저장 및 관리</li>
                  <li>SSL/TLS를 통한 데이터 전송 암호화</li>
                  <li>개인정보 접근 권한 제한</li>
                  <li>정기적인 보안 점검</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">5. 이용자의 권리 및 행사 방법</h4>
                <p className="text-muted-foreground mb-2">이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>개인정보 열람 요구</li>
                  <li>오류 등이 있을 경우 정정 요구</li>
                  <li>삭제 요구</li>
                  <li>처리정지 요구</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  권리 행사는 프로필 설정 페이지에서 직접 하시거나, 개인정보 보호책임자에게 서면, 이메일 등으로
                  연락하시면 지체없이 조치하겠습니다.
                </p>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">6. 만 14세 미만 아동의 개인정보 보호</h4>
                <p className="text-muted-foreground">
                  PinCanvas는 만 14세 이상의 이용자만 서비스에 가입할 수 없으며, 회원가입 시 생년월일 입력을 통해 만
                  14세 이상 여부를 확인합니다. 만 14세 미만 아동의 개인정보는 수집하지 않으며, 만 14세 미만임이 확인된
                  경우 회원가입이 거부됩니다. 만약 만 14세 미만 아동의 개인정보가 수집된 것이 확인될 경우, 해당 정보는
                  지체없이 파기됩니다.
                </p>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">7. 개인정보 보호책임자</h4>
                <ul className="list-none space-y-1 text-muted-foreground ml-2">
                  <li>
                    <strong>담당부서:</strong> 에세이
                  </li>
                  <li>
                    <strong>연락처:</strong> pincanvas@esay.co.kr
                  </li>
                </ul>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">8. 개인정보의 제3자 제공</h4>
                <p className="text-muted-foreground">
                  PinCanvas는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자의 동의가 있거나
                  법령에 의해 요구되는 경우에는 예외로 합니다.
                </p>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">9. 개인정보 처리 위탁</h4>
                <p className="text-muted-foreground mb-2">
                  PinCanvas는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm mt-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">수탁업체</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">위탁 업무 내용</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">보유 및 이용 기간</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-muted-foreground">Supabase</td>
                        <td className="border border-gray-300 px-4 py-2 text-muted-foreground">
                          데이터베이스 및 인증 서비스 운영
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-muted-foreground">
                          위탁 계약 종료 시까지
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <Separator />

              <section>
                <h4 className="font-semibold text-base mb-2">10. 개인정보처리방침의 변경</h4>
                <p className="text-muted-foreground">
                  이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는
                  경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
