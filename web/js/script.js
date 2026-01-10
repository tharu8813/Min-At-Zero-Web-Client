function handleClientAction(url, button, confirmMessage = null) {
    if (confirmMessage && !confirm(confirmMessage)) {
        return;
    }

    button.classList.add('loading');

    setTimeout(() => {
        window.location.href = url;
        button.classList.remove('loading');
    }, 300);
}

function startGame(button) {
    handleClientAction("matz-clinet://start", button);
}

function openLoginInfo(button) {
    handleClientAction("matz-clinet://login-info", button);
}

function reset(button) {
    handleClientAction("matz-clinet://reset", button, '클라이언트를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.');
}

window.addEventListener('load', () => {
    console.log('Min. At. Zero Launcher loaded');
});
