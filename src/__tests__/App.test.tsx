// シンプルなスモークテスト：基本的なReactコンポーネントが正常にレンダリングされるかを確認
import { render } from '@testing-library/react';

// シンプルなテスト用コンポーネント
function SimpleComponent() {
    return <div data-testid="simple">Hello, Test!</div>;
}

describe('スモークテスト', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
        const { getByTestId } = render(<SimpleComponent />);

        // コンポーネントがクラッシュせずにレンダリングされることを確認
        expect(getByTestId('simple')).toBeInTheDocument();
        expect(getByTestId('simple')).toHaveTextContent('Hello, Test!');
    });
});
