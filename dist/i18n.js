// Stellar Frontier — LINGUE.
// Inglese predefinito, più italiano, francese, spagnolo, russo, cinese e giapponese.
// Il gioco è scritto in italiano: ogni frase italiana visibile viene sostituita con la traduzione
// nei testi della pagina, negli attributi (aria-label, title, placeholder) e nei testi disegnati sul canvas.
// Colonne: [it, en, fr, es, ru, zh, ja]
const I18N_LANGS=[['en','English'],['it','Italiano'],['fr','Français'],['es','Español'],['ru','Русский'],['zh','中文'],['ja','日本語']];
const I18N_COL={it:0,en:1,fr:2,es:3,ru:4,zh:5,ja:6};
const I18N_ROWS=[
["MISSILE NEMICO IN ARRIVO","ENEMY MISSILE INCOMING","MISSILE ENNEMI EN APPROCHE","MISIL ENEMIGO EN CAMINO","ВРАЖЕСКАЯ РАКЕТА","敌方导弹来袭","敵ミサイル接近"],
["AGGANCIO NEMICO · SCHIVA O ABBATTI IL MISSILE","ENEMY LOCK · DODGE OR SHOOT DOWN THE MISSILE","VERROUILLAGE ENNEMI · ESQUIVE OU ABATS LE MISSILE","FIJACIÓN ENEMIGA · ESQUIVA O DERRIBA EL MISIL","ВРАГ ЗАХВАТЫВАЕТ · УКЛОНИСЬ ИЛИ СБЕЙ РАКЕТУ","敌方锁定 · 躲避或击落导弹","敵のロック · ミサイルを回避か撃墜"],
["MISSILE ABBATTUTO","MISSILE SHOT DOWN","MISSILE ABATTU","MISIL DERRIBADO","РАКЕТА СБИТА","导弹已击落","ミサイル撃墜"],
["MISSILE IN ARRIVO","MISSILE INCOMING","MISSILE EN APPROCHE","MISIL EN CAMINO","РАКЕТА ПРИБЛИЖАЕТСЯ","导弹来袭","ミサイル接近"],
["SEI AGGANCIATO","YOU ARE LOCKED","TU ES VERROUILLÉ","TE HAN FIJADO","ТЫ НА ПРИЦЕЛЕ","你已被锁定","ロックされた"],
["FRENA PER CONQUISTARE","BRAKE TO CONQUER","FREINE POUR CONQUÉRIR","FRENA PARA CONQUISTAR","ТОРМОЗИ ДЛЯ ЗАХВАТА","刹车以占领","ブレーキで制圧"],
["LABIRINTO ROCCIOSO","ROCK MAZE","LABYRINTHE ROCHEUX","LABERINTO DE ROCAS","КАМЕННЫЙ ЛАБИРИНТ","岩石迷宫","岩の迷路"],
["RAGGIUNGI L’ORBITA","REACH ORBIT","ATTEINS L’ORBITE","ALCANZA LA ÓRBITA","ВЫЙДИ НА ОРБИТУ","进入轨道","軌道に到達せよ"],
["BERSAGLIO AGGANCIATO","TARGET LOCKED","CIBLE VERROUILLÉE","OBJETIVO FIJADO","ЦЕЛЬ ЗАХВАЧЕНА","目标已锁定","ロックオン"],
["MISSILE PRONTO","MISSILE READY","MISSILE PRÊT","MISIL LISTO","РАКЕТА ГОТОВА","导弹就绪","ミサイル準備完了"],
["ALTO-DESTRA","UP-RIGHT","HAUT-DROITE","ARRIBA-DERECHA","СВЕРХУ-СПРАВА","右上","右上"],
["ALTO-SINISTRA","UP-LEFT","HAUT-GAUCHE","ARRIBA-IZQUIERDA","СВЕРХУ-СЛЕВА","左上","左上"],
["BASSO-DESTRA","DOWN-RIGHT","BAS-DROITE","ABAJO-DERECHA","СНИЗУ-СПРАВА","右下","右下"],
["BASSO-SINISTRA","DOWN-LEFT","BAS-GAUCHE","ABAJO-IZQUIERDA","СНИЗУ-СЛЕВА","左下","左下"],
["SALTO","JUMP","SAUT","SALTO","ПРЫЖОК","跳跃","ジャンプ"],
["SCUDO","SHIELD","BOUCLIER","ESCUDO","ЩИТ","护盾","シールド"],
["Ruota il telefono in orizzontale","Turn your phone sideways","Tourne ton téléphone à l’horizontale","Gira el teléfono en horizontal","Поверни телефон горизонтально","请将手机横过来","スマホを横向きにしてね"],
["Distanza","Distance","Distance","Distancia","Расстояние","距离","距離"],
["Minaccia bassa","Low threat","Menace faible","Amenaza baja","Угроза низкая","威胁低","脅威：低"],
["Minaccia moderata","Moderate threat","Menace modérée","Amenaza moderada","Угроза умеренная","威胁中等","脅威：中"],
["Minaccia elevata","High threat","Menace élevée","Amenaza elevada","Угроза высокая","威胁高","脅威：高"],
["Minaccia estrema","Extreme threat","Menace extrême","Amenaza extrema","Угроза крайняя","威胁极端","脅威：極大"],
["Minaccia critica","Critical threat","Menace critique","Amenaza crítica","Угроза критическая","威胁致命","脅威：危険"],
["BASSA","LOW","FAIBLE","BAJA","НИЗКАЯ","低","低"],
["Un mondo oceanico ai confini della nebulosa.","An ocean world on the edge of the nebula.","Un monde océanique aux confins de la nébuleuse.","Un mundo oceánico en los confines de la nebulosa.","Океанский мир на краю туманности.","星云边缘的海洋世界。","星雲の果てにある海洋惑星。"],
["MODERATA","MODERATE","MODÉRÉE","MODERADA","СРЕДНЯЯ","中等","中"],
["Deserti incandescenti e pattuglie di confine.","Scorching deserts and border patrols.","Déserts brûlants et patrouilles frontalières.","Desiertos abrasadores y patrullas fronterizas.","Раскалённые пустыни и пограничные патрули.","炽热的沙漠与边境巡逻队。","灼熱の砂漠と国境パトロール。"],
["ELEVATA","HIGH","ÉLEVÉE","ALTA","ВЫСОКАЯ","高","高"],
["Gigante gassoso cinto da relitti titanici.","A gas giant ringed by titanic wrecks.","Une géante gazeuse ceinte d’épaves titanesques.","Un gigante gaseoso rodeado de restos titánicos.","Газовый гигант в кольце титанических обломков.","被巨型残骸环绕的气态巨行星。","巨大な残骸に囲まれたガス惑星。"],
["CRITICA","CRITICAL","CRITIQUE","CRÍTICA","КРИТИЧЕСКАЯ","危急","危険"],
["Mondo di foreste aliene sorvegliato da forme di vita colossali.","A world of alien forests guarded by colossal life forms.","Un monde de forêts extraterrestres gardé par des formes de vie colossales.","Un mundo de bosques alienígenas vigilado por formas de vida colosales.","Мир инопланетных лесов под охраной колоссальных существ.","由巨型生物守护的异星森林世界。","巨大生物が守る異星の森の世界。"],
["ESTREMA","EXTREME","EXTRÊME","EXTREMA","ЭКСТРЕМАЛЬНАЯ","极端","極限"],
["Un pianeta di lava nel cuore del territorio nemico.","A lava planet in the heart of enemy territory.","Une planète de lave au cœur du territoire ennemi.","Un planeta de lava en el corazón del territorio enemigo.","Лавовая планета в сердце вражеской территории.","敌方领土中心的熔岩星球。","敵領域の中心にある溶岩惑星。"],
["ATTIVO","ON","ACTIVÉ","ACTIVADO","ВКЛ","开启","オン"],
["DISATTIVATO","OFF","DÉSACTIVÉ","DESACTIVADO","ВЫКЛ","关闭","オフ"],
["ROTTA PER ","COURSE TO ","CAP SUR ","RUMBO A ","КУРС НА ","航向 ","目的地 "],
[". Elimina le guardie orbitali, rallenta con F e mantieni la posizione per 5 secondi per conquistare il pianeta. Il campo roccioso forma un labirinto irregolare. Rocce marroni: fragili; azzurre: resistenti; viola: molto resistenti ed esplosive. Gli urti consumano molta barriera e le rocce distrutte rilasciano frammenti pericolosi. Usa F, S e A/D per attraversare i passaggi. Costi: colpo 1 CR, missile 25 CR, carburante 2 CR per unità.",". Destroy the orbital guards, slow down with F and hold your position for 5 seconds to conquer the planet. The rock field forms an irregular maze. Brown rocks: fragile; blue: tough; purple: very tough and explosive. Collisions drain a lot of barrier and destroyed rocks release dangerous fragments. Use F, S and A/D to get through the gaps. Costs: shot 1 CR, missile 25 CR, fuel 2 CR per unit.",". Élimine les gardes orbitaux, ralentis avec F et garde ta position 5 secondes pour conquérir la planète. Le champ rocheux forme un labyrinthe irrégulier. Roches brunes : fragiles ; bleues : résistantes ; violettes : très résistantes et explosives. Les chocs consomment beaucoup de barrière et les roches détruites libèrent des fragments dangereux. Utilise F, S et A/D pour franchir les passages. Coûts : tir 1 CR, missile 25 CR, carburant 2 CR par unité.",". Elimina a los guardias orbitales, frena con F y mantén la posición 5 segundos para conquistar el planeta. El campo de rocas forma un laberinto irregular. Rocas marrones: frágiles; azules: resistentes; violetas: muy resistentes y explosivas. Los choques gastan mucha barrera y las rocas destruidas sueltan fragmentos peligrosos. Usa F, S y A/D para cruzar los pasos. Costes: disparo 1 CR, misil 25 CR, combustible 2 CR por unidad.",". Уничтожь орбитальную охрану, затормози клавишей F и удерживай позицию 5 секунд, чтобы захватить планету. Каменное поле образует неровный лабиринт. Коричневые камни хрупкие, голубые прочные, фиолетовые очень прочные и взрывоопасные. Столкновения сильно тратят барьер, а разрушенные камни разлетаются опасными осколками. Используй F, S и A/D, чтобы проходить узкие места. Цены: выстрел 1 CR, ракета 25 CR, топливо 2 CR за единицу.","。消灭轨道守卫，按 F 减速并保持位置 5 秒即可占领星球。岩石带形成不规则的迷宫。棕色岩石易碎；蓝色坚固；紫色非常坚固且会爆炸。碰撞会大量消耗屏障，被摧毁的岩石会飞出危险碎片。用 F、S 和 A/D 穿过缝隙。费用：射击 1 CR，导弹 25 CR，燃料每单位 2 CR。","。軌道の護衛を倒し、F で減速して 5 秒間位置を保てば惑星を制圧できる。岩石帯は不規則な迷路になっている。茶色の岩はもろく、青は硬く、紫はとても硬く爆発する。衝突はバリアを大きく消費し、壊れた岩は危険な破片を飛ばす。F、S、A/D で隙間を抜けよう。費用：射撃 1 CR、ミサイル 25 CR、燃料 1 単位 2 CR。"],
["FINESTRA","WINDOW","FENÊTRE","VENTANA","ОКНО","窗口","ウィンドウ"],
["SCHERMO INTERO","FULL SCREEN","PLEIN ÉCRAN","PANTALLA COMPLETA","ПОЛНЫЙ ЭКРАН","全屏","全画面"],
["Ripristina visuale Windows","Restore window view","Rétablir la vue fenêtrée","Restaurar vista en ventana","Вернуть оконный режим","恢复窗口模式","ウィンドウ表示に戻す"],
["Passa a schermo intero","Switch to full screen","Passer en plein écran","Pasar a pantalla completa","Перейти в полноэкранный режим","切换到全屏","全画面にする"],
["SCHERMO INTERO NON DISPONIBILE","FULL SCREEN NOT AVAILABLE","PLEIN ÉCRAN INDISPONIBLE","PANTALLA COMPLETA NO DISPONIBLE","ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН","无法全屏","全画面は利用できません"],
["USCITA DALL’IPERSPAZIO","LEAVING HYPERSPACE","SORTIE DE L’HYPERESPACE","SALIENDO DEL HIPERESPACIO","ВЫХОД ИЗ ГИПЕРПРОСТРАНСТВА","退出超空间","ハイパースペース離脱"],
["CAPSULA BARRIERA · +35%","BARRIER CAPSULE · +35%","CAPSULE BARRIÈRE · +35%","CÁPSULA DE BARRERA · +35%","КАПСУЛА БАРЬЕРА · +35%","屏障胶囊 · +35%","バリアカプセル · +35%"],
["RIPARAZIONE SCAFO +22%","HULL REPAIR +22%","RÉPARATION COQUE +22%","REPARACIÓN DEL CASCO +22%","РЕМОНТ КОРПУСА +22%","船体修复 +22%","船体修理 +22%"],
["ENERGIA RECUPERATA","ENERGY RECOVERED","ÉNERGIE RÉCUPÉRÉE","ENERGÍA RECUPERADA","ЭНЕРГИЯ ВОССТАНОВЛЕНА","能量已回收","エネルギー回収"],
["IMPATTO · RIPRISTINO COMANDI","IMPACT · RESTORING CONTROLS","IMPACT · RÉTABLISSEMENT DES COMMANDES","IMPACTO · RESTAURANDO CONTROLES","УДАР · ВОССТАНОВЛЕНИЕ УПРАВЛЕНИЯ","撞击 · 正在恢复操控","衝撃 · 操作復帰中"],
["ELIMINA LE GUARDIE ORBITALI","DESTROY THE ORBITAL GUARDS","ÉLIMINE LES GARDES ORBITAUX","ELIMINA A LOS GUARDIAS ORBITALES","УНИЧТОЖЬ ОРБИТАЛЬНУЮ ОХРАНУ","消灭轨道守卫","軌道の護衛を倒せ"],
["RALLENTA CON F PER CONQUISTARE","SLOW DOWN WITH F TO CONQUER","RALENTIS AVEC F POUR CONQUÉRIR","FRENA CON F PARA CONQUISTAR","ТОРМОЗИ КЛАВИШЕЙ F ДЛЯ ЗАХВАТА","按 F 减速以占领","F で減速して制圧"],
["CONQUISTA ORBITALE · ","ORBITAL CAPTURE · ","CONQUÊTE ORBITALE · ","CONQUISTA ORBITAL · ","ЗАХВАТ ОРБИТЫ · ","轨道占领 · ","軌道制圧 · "],
["LABIRINTO ROCCIOSO · MANOVRA CON F / S / A / D","ROCK MAZE · MANEUVER WITH F / S / A / D","LABYRINTHE ROCHEUX · MANŒUVRE AVEC F / S / A / D","LABERINTO DE ROCAS · MANIOBRA CON F / S / A / D","КАМЕННЫЙ ЛАБИРИНТ · МАНЁВР: F / S / A / D","岩石迷宫 · 用 F / S / A / D 操纵","岩の迷路 · F / S / A / D で操縦"],
["RAGGIUNGI L’ORBITA · FRENO: F","REACH ORBIT · BRAKE: F","ATTEINS L’ORBITE · FREIN : F","ALCANZA LA ÓRBITA · FRENO: F","ВЫЙДИ НА ОРБИТУ · ТОРМОЗ: F","进入轨道 · 刹车：F","軌道に到達せよ · ブレーキ：F"],
["SISTEMI NOMINALI","SYSTEMS NOMINAL","SYSTÈMES NOMINAUX","SISTEMAS NOMINALES","СИСТЕМЫ В НОРМЕ","系统正常","システム正常"],
["IMPATTO · CONTROLLO SOSPESO","IMPACT · CONTROL SUSPENDED","IMPACT · CONTRÔLE SUSPENDU","IMPACTO · CONTROL SUSPENDIDO","УДАР · УПРАВЛЕНИЕ ПОТЕРЯНО","撞击 · 操控暂停","衝撃 · 操作不能"],
["USCITA COMPLETATA · COMANDI ATTIVI","EXIT COMPLETE · CONTROLS ACTIVE","SORTIE TERMINÉE · COMMANDES ACTIVES","SALIDA COMPLETADA · CONTROLES ACTIVOS","ВЫХОД ЗАВЕРШЁН · УПРАВЛЕНИЕ АКТИВНО","退出完成 · 操控已启用","離脱完了 · 操作可能"],
["POST-BRUCIATORE ATTIVO","AFTERBURNER ON","POSTCOMBUSTION ACTIVE","POSCOMBUSTIÓN ACTIVA","ФОРСАЖ ВКЛЮЧЁН","加力已开启","アフターバーナー作動"],
["POST-BRUCIATORE ESAURITO","AFTERBURNER DEPLETED","POSTCOMBUSTION ÉPUISÉE","POSCOMBUSTIÓN AGOTADA","ФОРСАЖ ИСЧЕРПАН","加力已耗尽","アフターバーナー切れ"],
["POST-BRUCIATORE PRONTO","AFTERBURNER READY","POSTCOMBUSTION PRÊTE","POSCOMBUSTIÓN LISTA","ФОРСАЖ ГОТОВ","加力就绪","アフターバーナー準備完了"],
["BARRIERA ESAURITA · RILASCIA PER RICARICARE","BARRIER DEPLETED · RELEASE TO RECHARGE","BARRIÈRE ÉPUISÉE · RELÂCHE POUR RECHARGER","BARRERA AGOTADA · SUELTA PARA RECARGAR","БАРЬЕР ИСЧЕРПАН · ОТПУСТИ ДЛЯ ЗАРЯДКИ","屏障耗尽 · 松开以充能","バリア切れ · 離して充電"],
[" KM"," KM"," KM"," KM"," КМ"," 公里"," km"],
["DESTRA","RIGHT","DROITE","DERECHA","СПРАВА","右","右"],
["SOTTO","BELOW","EN BAS","ABAJO","СНИЗУ","下","下"],
["SINISTRA","LEFT","GAUCHE","IZQUIERDA","СЛЕВА","左","左"],
["SOPRA","ABOVE","EN HAUT","ARRIBA","СВЕРХУ","上","上"],
["OBIETTIVO: ","TARGET: ","OBJECTIF : ","OBJETIVO: ","ЦЕЛЬ: ","目标：","目標："],
["PRONTO","READY","PRÊT","LISTO","ГОТОВ","就绪","準備完了"],
["RICARICA","RECHARGING","RECHARGE","RECARGA","ЗАРЯДКА","充能中","充電中"],
["ORBITA RAGGIUNTA","ORBIT REACHED","ORBITE ATTEINTE","ÓRBITA ALCANZADA","ОРБИТА ДОСТИГНУТА","已进入轨道","軌道到達"],
["SEGNALE INTERROTTO","SIGNAL LOST","SIGNAL INTERROMPU","SEÑAL PERDIDA","СИГНАЛ ПОТЕРЯН","信号中断","信号途絶"],
["MISSIONE COMPIUTA","MISSION ACCOMPLISHED","MISSION ACCOMPLIE","MISIÓN CUMPLIDA","МИССИЯ ВЫПОЛНЕНА","任务完成","任務完了"],
["NAVE DISTRUTTA","SHIP DESTROYED","VAISSEAU DÉTRUIT","NAVE DESTRUIDA","КОРАБЛЬ УНИЧТОЖЕН","飞船被摧毁","艦船撃沈"],
[" è a portata. Orbita conquistata. Il premio di "," is within reach. Orbit conquered. The reward of "," est à portée. Orbite conquise. La prime de "," está al alcance. Órbita conquistada. El premio de "," в пределах досягаемости. Орбита захвачена. Награда "," 近在眼前。轨道已占领。"," は目前だ。軌道を制圧した。報酬 "],
[" ti aspetta alla liberazione della colonia (fase 2). La ricarica della barriera è potenziata nelle prossime missioni."," awaits you when you free the colony (phase 2). Barrier recharge is boosted in the next missions."," t’attend à la libération de la colonie (phase 2). La recharge de la barrière est renforcée pour les prochaines missions."," te espera al liberar la colonia (fase 2). La recarga de la barrera mejora en las próximas misiones."," ждёт тебя после освобождения колонии (фаза 2). Зарядка барьера усилена в следующих миссиях."," 的奖励将在解放殖民地（第 2 阶段）后发放。接下来的任务中屏障充能更快。"," はコロニー解放（フェーズ 2）で受け取れる。次のミッションからバリアの充電が強化される。"],
["Il settore ha respinto l’incursione. Ricalibra i sistemi e tenta una nuova rotta.","The sector repelled the raid. Recalibrate your systems and try a new course.","Le secteur a repoussé l’incursion. Recalibre tes systèmes et tente une nouvelle route.","El sector ha rechazado la incursión. Recalibra los sistemas e intenta otra ruta.","Сектор отразил вторжение. Перенастрой системы и попробуй новый курс.","该星区击退了突袭。重新校准系统，尝试新的航线。","セクターは侵攻を退けた。システムを再調整し、新たな航路を試そう。"],
["RECUPERO ENERGIA ×4","ENERGY RECOVERY ×4","RÉCUPÉRATION D’ÉNERGIE ×4","RECUPERACIÓN DE ENERGÍA ×4","ВОССТАНОВЛЕНИЕ ЭНЕРГИИ ×4","能量回收 ×4","エネルギー回収 ×4"],
["MISSILI IN VOLO","MISSILES IN FLIGHT","MISSILES EN VOL","MISILES EN VUELO","РАКЕТЫ В ПОЛЁТЕ","导弹飞行中","ミサイル飛行中"],
["MISSILE IN VOLO","MISSILE IN FLIGHT","MISSILE EN VOL","MISIL EN VUELO","РАКЕТА В ПОЛЁТЕ","导弹飞行中","ミサイル飛行中"],
["BERSAGLIO AGGANCIATO · CLIC ROTELLA","TARGET LOCKED · WHEEL CLICK","CIBLE VERROUILLÉE · CLIC MOLETTE","OBJETIVO FIJADO · CLIC RUEDA","ЦЕЛЬ ЗАХВАЧЕНА · КЛИК КОЛЁСИКОМ","目标已锁定 · 点击滚轮","ロックオン · ホイールクリック"],
["AGGANCIO ","LOCK ","VERROUILLAGE ","FIJANDO ","ЗАХВАТ ","锁定 ","ロック "],
["% · CLIC ROTELLA: TIRO DIRITTO","% · WHEEL CLICK: STRAIGHT SHOT","% · CLIC MOLETTE : TIR DROIT","% · CLIC RUEDA: TIRO RECTO","% · КЛИК КОЛЁСИКОМ: ПРЯМОЙ ВЫСТРЕЛ","% · 点击滚轮：直线发射","% · ホイールクリック：直進発射"],
["MISSILE PRONTO · CLIC ROTELLA: TIRO DIRITTO","MISSILE READY · WHEEL CLICK: STRAIGHT SHOT","MISSILE PRÊT · CLIC MOLETTE : TIR DROIT","MISIL LISTO · CLIC RUEDA: TIRO RECTO","РАКЕТА ГОТОВА · КЛИК КОЛЁСИКОМ: ПРЯМОЙ ВЫСТРЕЛ","导弹就绪 · 点击滚轮：直线发射","ミサイル準備完了 · ホイールクリック：直進発射"],
["CREDITI INSUFFICIENTI PER IL MISSILE","NOT ENOUGH CREDITS FOR THE MISSILE","CRÉDITS INSUFFISANTS POUR LE MISSILE","CRÉDITOS INSUFICIENTES PARA EL MISIL","НЕ ХВАТАЕТ КРЕДИТОВ НА РАКЕТУ","导弹所需积分不足","ミサイルのクレジット不足"],
[" MISSILI "," MISSILES "," MISSILES "," MISILES "," РАКЕТЫ "," 枚导弹 "," 発のミサイル "],
["AUTOGUIDATI LANCIATI","HOMING LAUNCHED","AUTOGUIDÉS LANCÉS","GUIADOS LANZADOS","САМОНАВОДЯЩИХСЯ ЗАПУЩЕНО","制导发射","誘導発射"],
["MISSILE AUTOGUIDATO LANCIATO","HOMING MISSILE LAUNCHED","MISSILE AUTOGUIDÉ LANCÉ","MISIL GUIADO LANZADO","САМОНАВОДЯЩАЯСЯ РАКЕТА ЗАПУЩЕНА","制导导弹已发射","誘導ミサイル発射"],
["LANCIATI · ROTTA DIRITTA","LAUNCHED · STRAIGHT COURSE","LANCÉS · TRAJECTOIRE DROITE","LANZADOS · RUMBO RECTO","ЗАПУЩЕНО · ПРЯМОЙ КУРС","已发射 · 直线航向","発射 · 直進"],
["MISSILE LANCIATO · ROTTA DIRITTA","MISSILE LAUNCHED · STRAIGHT COURSE","MISSILE LANCÉ · TRAJECTOIRE DROITE","MISIL LANZADO · RUMBO RECTO","РАКЕТА ЗАПУЩЕНА · ПРЯМОЙ КУРС","导弹已发射 · 直线航向","ミサイル発射 · 直進"],
["AGGANCIATO","LOCKED","VERROUILLÉ","FIJADO","ЗАХВАЧЕНО","已锁定","ロック済"],
["AGGANCIO","LOCK","VERROUILLAGE","FIJANDO","ЗАХВАТ","锁定","ロック"],
["RINFORZI NEMICI · ONDATA ","ENEMY REINFORCEMENTS · WAVE ","RENFORTS ENNEMIS · VAGUE ","REFUERZOS ENEMIGOS · OLEADA ","ВРАЖЕСКОЕ ПОДКРЕПЛЕНИЕ · ВОЛНА ","敌方增援 · 第 ","敵の増援 · 第 "],
["FLOTTA NEMICA IN ATTESA ATTORNO A ","ENEMY FLEET WAITING AROUND ","FLOTTE ENNEMIE EN ATTENTE AUTOUR DE ","FLOTA ENEMIGA ESPERANDO ALREDEDOR DE ","ВРАЖЕСКИЙ ФЛОТ ЖДЁТ У ","敌方舰队在此等候：","敵艦隊が待ち構える："],
[" NAVI"," SHIPS"," VAISSEAUX"," NAVES"," КОРАБЛЕЙ"," 艘舰船"," 隻"],
["CINTURA ROCCIOSA · CERCA I PASSAGGI · ATTENZIONE AI FRAMMENTI","ROCK BELT · FIND THE GAPS · WATCH OUT FOR FRAGMENTS","CEINTURE ROCHEUSE · CHERCHE LES PASSAGES · ATTENTION AUX FRAGMENTS","CINTURÓN DE ROCAS · BUSCA LOS PASOS · CUIDADO CON LOS FRAGMENTOS","КАМЕННЫЙ ПОЯС · ИЩИ ПРОХОДЫ · ОСТОРОЖНО, ОСКОЛКИ","岩石带 · 寻找通道 · 小心碎片","岩石帯 · 隙間を探せ · 破片に注意"],
["ALLARME · METEORITE IN ARRIVO · SCHIVA","ALERT · INCOMING METEOR · DODGE","ALERTE · MÉTÉORITE EN APPROCHE · ESQUIVE","ALARMA · METEORITO ENTRANTE · ESQUIVA","ТРЕВОГА · МЕТЕОРИТ · УКЛОНЯЙСЯ","警报 · 陨石来袭 · 躲避","警報 · 隕石接近 · 回避せよ"],
["IMPATTO METEORITE · SCAFO −75%","METEOR IMPACT · HULL −75%","IMPACT DE MÉTÉORITE · COQUE −75%","IMPACTO DE METEORITO · CASCO −75%","УДАР МЕТЕОРИТА · КОРПУС −75%","陨石撞击 · 船体 −75%","隕石衝突 · 船体 −75%"],
["METEORITE · ","METEOR · ","MÉTÉORITE · ","METEORITO · ","МЕТЕОРИТ · ","陨石 · ","隕石 · "],
["CALCOLO DEL SALTO","CALCULATING JUMP","CALCUL DU SAUT","CALCULANDO EL SALTO","РАСЧЁТ ПРЫЖКА","计算跃迁","ジャンプ計算中"],
["IPERSPAZIO","HYPERSPACE","HYPERESPACE","HIPERESPACIO","ГИПЕРПРОСТРАНСТВО","超空间","ハイパースペース"],
["ROTTA BLOCCATA / ","COURSE LOCKED / ","ROUTE VERROUILLÉE / ","RUMBO FIJADO / ","КУРС ЗАДАН / ","航线锁定 / ","航路固定 / "],
["⚠ METEORITE IN ARRIVO · ","⚠ INCOMING METEOR · ","⚠ MÉTÉORITE EN APPROCHE · ","⚠ METEORITO ENTRANTE · ","⚠ МЕТЕОРИТ · ","⚠ 陨石来袭 · ","⚠ 隕石接近 · "],
[" s · CAMBIA ROTTA"," s · CHANGE COURSE"," s · CHANGE DE CAP"," s · CAMBIA EL RUMBO"," с · СМЕНИ КУРС"," 秒 · 改变航向"," 秒 · 進路変更"],
["METEORITE FRAMMENTATO · SCHIVA I DETRITI","METEOR SHATTERED · DODGE THE DEBRIS","MÉTÉORITE FRAGMENTÉE · ESQUIVE LES DÉBRIS","METEORITO FRAGMENTADO · ESQUIVA LOS ESCOMBROS","МЕТЕОРИТ РАЗБИТ · УКЛОНЯЙСЯ ОТ ОБЛОМКОВ","陨石已碎裂 · 躲避碎片","隕石粉砕 · 破片を回避"],
["RELITTO DISTRUTTO · 4 RIFORNIMENTI ENERGETICI","WRECK DESTROYED · 4 ENERGY SUPPLIES","ÉPAVE DÉTRUITE · 4 RAVITAILLEMENTS D’ÉNERGIE","RESTO DESTRUIDO · 4 SUMINISTROS DE ENERGÍA","ОБЛОМОК УНИЧТОЖЕН · 4 ЗАПАСА ЭНЕРГИИ","残骸已摧毁 · 4 份能量补给","残骸破壊 · エネルギー補給 4 個"],
["INGRESSO IN ORBITA · ","ENTERING ORBIT · ","ENTRÉE EN ORBITE · ","ENTRANDO EN ÓRBITA · ","ВЫХОД НА ОРБИТУ · ","进入轨道 · ","軌道進入 · "],
["INGRESSO NELL’ATMOSFERA · PIOGGIA DI METEORITI","ENTERING THE ATMOSPHERE · METEOR SHOWER","ENTRÉE DANS L’ATMOSPHÈRE · PLUIE DE MÉTÉORITES","ENTRADA EN LA ATMÓSFERA · LLUVIA DE METEORITOS","ВХОД В АТМОСФЕРУ · МЕТЕОРИТНЫЙ ДОЖДЬ","进入大气层 · 流星雨","大気圏突入 · 流星雨"],
["IMPATTO METEORITE · SCAFO −16%","METEOR IMPACT · HULL −16%","IMPACT DE MÉTÉORITE · COQUE −16%","IMPACTO DE METEORITO · CASCO −16%","УДАР МЕТЕОРИТА · КОРПУС −16%","陨石撞击 · 船体 −16%","隕石衝突 · 船体 −16%"],
["MARE","SEA","MER","MAR","МОРЕ","海洋","海"],
["La colonia sorge su isole e piattaforme in mezzo all’oceano: attento a non cadere in mare.","The colony stands on islands and platforms in the middle of the ocean: careful not to fall into the sea.","La colonie se dresse sur des îles et des plateformes en plein océan : attention à ne pas tomber à la mer.","La colonia se alza sobre islas y plataformas en medio del océano: cuidado con caer al mar.","Колония стоит на островах и платформах посреди океана: смотри не упади в море.","殖民地建在海洋中央的岛屿和平台上：小心别掉进海里。","コロニーは海の真ん中の島と足場の上にある。海に落ちないよう注意。"],
["COLONIA SUL MARE · LIBERA GLI OSTAGGI","SEA COLONY · FREE THE HOSTAGES","COLONIE MARINE · LIBÈRE LES OTAGES","COLONIA EN EL MAR · LIBERA A LOS REHENES","МОРСКАЯ КОЛОНИЯ · ОСВОБОДИ ЗАЛОЖНИКОВ","海上殖民地 · 解救人质","海のコロニー · 人質を解放せよ"],
["CADUTO IN MARE","FELL INTO THE SEA","TOMBÉ À LA MER","CAÍDO AL MAR","УПАЛ В МОРЕ","坠入海中","海に転落"],
["DESERTO","DESERT","DÉSERT","DESIERTO","ПУСТЫНЯ","沙漠","砂漠"],
["La colonia è sepolta tra le dune di un deserto rovente: evita le sabbie mobili.","The colony is buried among the dunes of a scorching desert: avoid the quicksand.","La colonie est ensevelie entre les dunes d’un désert brûlant : évite les sables mouvants.","La colonia está enterrada entre las dunas de un desierto ardiente: evita las arenas movedizas.","Колония погребена среди дюн раскалённой пустыни: избегай зыбучих песков.","殖民地埋藏在炽热沙漠的沙丘之间：避开流沙。","コロニーは灼熱の砂丘に埋もれている。流砂を避けよう。"],
["COLONIA NEL DESERTO · LIBERA GLI OSTAGGI","DESERT COLONY · FREE THE HOSTAGES","COLONIE DU DÉSERT · LIBÈRE LES OTAGES","COLONIA DEL DESIERTO · LIBERA A LOS REHENES","ПУСТЫННАЯ КОЛОНИЯ · ОСВОБОДИ ЗАЛОЖНИКОВ","沙漠殖民地 · 解救人质","砂漠のコロニー · 人質を解放せよ"],
["INGHIOTTITO DALLE SABBIE MOBILI","SWALLOWED BY QUICKSAND","ENGLOUTI PAR LES SABLES MOUVANTS","TRAGADO POR LAS ARENAS MOVEDIZAS","ПОГЛОЩЁН ЗЫБУЧИМИ ПЕСКАМИ","被流沙吞没","流砂に飲まれた"],
["FORESTA","FOREST","FORÊT","BOSQUE","ЛЕС","森林","森"],
["La colonia è nascosta in una fitta foresta aliena: i burroni finiscono in una palude.","The colony is hidden in a dense alien forest: the ravines end in a swamp.","La colonie est cachée dans une épaisse forêt extraterrestre : les ravins finissent dans un marais.","La colonia se oculta en un denso bosque alienígena: los barrancos acaban en un pantano.","Колония спрятана в густом инопланетном лесу: овраги ведут в болото.","殖民地隐藏在茂密的异星森林中：峡谷底下是沼泽。","コロニーは深い異星の森に隠れている。谷底は沼だ。"],
["COLONIA NELLA FORESTA · LIBERA GLI OSTAGGI","FOREST COLONY · FREE THE HOSTAGES","COLONIE DE LA FORÊT · LIBÈRE LES OTAGES","COLONIA DEL BOSQUE · LIBERA A LOS REHENES","ЛЕСНАЯ КОЛОНИЯ · ОСВОБОДИ ЗАЛОЖНИКОВ","森林殖民地 · 解救人质","森のコロニー · 人質を解放せよ"],
["CADUTO NELLA PALUDE","FELL INTO THE SWAMP","TOMBÉ DANS LE MARAIS","CAÍDO AL PANTANO","УПАЛ В БОЛОТО","坠入沼泽","沼に転落"],
["LAVA","LAVA","LAVE","LAVA","ЛАВА","熔岩","溶岩"],
["La colonia resiste su rocce vulcaniche circondate dalla lava: una caduta brucia più del solito.","The colony holds out on volcanic rocks surrounded by lava: a fall burns more than usual.","La colonie résiste sur des roches volcaniques entourées de lave : une chute brûle plus que d’habitude.","La colonia resiste sobre rocas volcánicas rodeadas de lava: una caída quema más de lo normal.","Колония держится на вулканических скалах среди лавы: падение обжигает сильнее обычного.","殖民地坚守在熔岩环绕的火山岩上：坠落造成的伤害比平时更大。","コロニーは溶岩に囲まれた火山岩の上で耐えている。落下のダメージは大きい。"],
["COLONIA TRA LA LAVA · LIBERA GLI OSTAGGI","LAVA COLONY · FREE THE HOSTAGES","COLONIE DANS LA LAVE · LIBÈRE LES OTAGES","COLONIA ENTRE LA LAVA · LIBERA A LOS REHENES","КОЛОНИЯ СРЕДИ ЛАВЫ · ОСВОБОДИ ЗАЛОЖНИКОВ","熔岩殖民地 · 解救人质","溶岩のコロニー · 人質を解放せよ"],
["CADUTO NELLA LAVA","FELL INTO THE LAVA","TOMBÉ DANS LA LAVE","CAÍDO A LA LAVA","УПАЛ В ЛАВУ","坠入熔岩","溶岩に転落"],
["TEMPESTA","STORM","TEMPÊTE","TORMENTA","БУРЯ","风暴","嵐"],
["La colonia galleggia tra le nubi di un gigante gassoso in tempesta: sotto le piattaforme c’è il vuoto.","The colony floats among the clouds of a stormy gas giant: below the platforms there is only void.","La colonie flotte dans les nuages d’une géante gazeuse en tempête : sous les plateformes, c’est le vide.","La colonia flota entre las nubes de un gigante gaseoso en tormenta: bajo las plataformas está el vacío.","Колония парит в облаках штормового газового гиганта: под платформами пустота.","殖民地漂浮在风暴肆虐的气态巨行星云层中：平台下方是虚空。","コロニーは嵐のガス惑星の雲間に浮かぶ。足場の下は虚空だ。"],
["COLONIA TRA LE NUBI · LIBERA GLI OSTAGGI","CLOUD COLONY · FREE THE HOSTAGES","COLONIE DANS LES NUAGES · LIBÈRE LES OTAGES","COLONIA ENTRE LAS NUBES · LIBERA A LOS REHENES","ОБЛАЧНАЯ КОЛОНИЯ · ОСВОБОДИ ЗАЛОЖНИКОВ","云中殖民地 · 解救人质","雲のコロニー · 人質を解放せよ"],
["PRECIPITATO TRA LE NUBI","FELL THROUGH THE CLOUDS","TOMBÉ DANS LES NUAGES","CAÍDO ENTRE LAS NUBES","УПАЛ СКВОЗЬ ОБЛАКА","坠入云海","雲の中へ転落"],
["COLONIA DI ","COLONY OF ","COLONIE DE ","COLONIA DE ","КОЛОНИЯ ","殖民地 ","コロニー "],
["I ribelli del Fronte Ombra vogliono rovesciare la Repubblica Intergalattica e hanno invaso la colonia di ","The rebels of the Shadow Front want to overthrow the Intergalactic Republic and have invaded the colony of ","Les rebelles du Front de l’Ombre veulent renverser la République intergalactique et ont envahi la colonie de ","Los rebeldes del Frente Sombra quieren derrocar a la República Intergaláctica y han invadido la colonia de ","Мятежники Теневого фронта хотят свергнуть Межгалактическую республику и захватили колонию ","暗影阵线的叛军想推翻星际共和国，并已入侵殖民地 ","影の戦線の反乱軍は銀河共和国の転覆を狙い、コロニーに侵攻した："],
[" Atterra, avanza verso est e respingi i ribelli che ti vengono incontro. Lungo la strada libera i coloni prigionieri: ognuno ti lascia un rifornimento. In fondo ti aspetta "," Land, push east and fight back the rebels coming at you. Along the way free the captured colonists: each one leaves you a supply. At the end awaits "," Atterris, avance vers l’est et repousse les rebelles qui viennent à ta rencontre. En chemin, libère les colons prisonniers : chacun te laisse un ravitaillement. Au bout t’attend "," Aterriza, avanza hacia el este y rechaza a los rebeldes que te salen al paso. Por el camino libera a los colonos prisioneros: cada uno te deja un suministro. Al final te espera "," Приземлись, двигайся на восток и отбивайся от мятежников. По пути освобождай пленных колонистов: каждый оставит тебе припасы. В конце тебя ждёт "," 着陆后向东推进，击退迎面而来的叛军。沿途解救被俘的殖民者：每人都会留下补给。尽头等着你的是 "," 着陸して東へ進み、迫る反乱軍を撃退せよ。道中で捕らわれた入植者を解放すれば補給を残してくれる。最後に待つのは "],
[": distruggilo. Il jetpack ti fa fare il doppio salto: tieni premuto per restare in volo. Premio della missione: ",": destroy it. The jetpack gives you a double jump: hold to stay airborne. Mission reward: "," : détruis-le. Le jetpack te permet un double saut : maintiens pour rester en l’air. Prime de mission : ",": destrúyelo. El jetpack te da un doble salto: mantén pulsado para seguir en el aire. Premio de la misión: ",": уничтожь его. Джетпак даёт двойной прыжок: удерживай, чтобы оставаться в воздухе. Награда за миссию: "," ：摧毁它。喷气背包可实现二段跳：按住可停留在空中。任务奖励："," 。破壊せよ。ジェットパックで二段ジャンプ、押し続けると空中に留まれる。ミッション報酬："],
["FASE 2 · ","PHASE 2 · ","PHASE 2 · ","FASE 2 · ","ФАЗА 2 · ","第 2 阶段 · ","フェーズ 2 · "],
["DISCESA ATMOSFERICA · ","ATMOSPHERIC DESCENT · ","DESCENTE ATMOSPHÉRIQUE · ","DESCENSO ATMOSFÉRICO · ","СПУСК В АТМОСФЕРЕ · ","大气层下降 · ","大気圏降下 · "],
["RIBELLI","REBELS","REBELLES","REBELDES","МЯТЕЖНИКИ","叛军","反乱軍"],
["TEMPO","TIME","TEMPS","TIEMPO","ВРЕМЯ","时间","時間"],
["COLONI","COLONISTS","COLONS","COLONOS","КОЛОНИСТЫ","殖民者","入植者"],
["COLONIA LIBERATA","COLONY FREED","COLONIE LIBÉRÉE","COLONIA LIBERADA","КОЛОНИЯ ОСВОБОЖДЕНА","殖民地已解放","コロニー解放"],
["SEGNALE VITALE PERSO","LIFE SIGNAL LOST","SIGNAL VITAL PERDU","SEÑAL VITAL PERDIDA","ЖИЗНЕННЫЙ СИГНАЛ ПОТЕРЯН","生命信号消失","生体信号消失"],
["PILOTA CADUTO","PILOT DOWN","PILOTE TOMBÉ","PILOTO CAÍDO","ПИЛОТ ПОГИБ","飞行员阵亡","パイロット戦死"],
[" torna sotto la protezione della Repubblica Intergalattica. Ostaggi liberati: "," returns under the protection of the Intergalactic Republic. Hostages freed: "," repasse sous la protection de la République intergalactique. Otages libérés : "," vuelve bajo la protección de la República Intergaláctica. Rehenes liberados: "," снова под защитой Межгалактической республики. Освобождено заложников: "," 重回星际共和国的保护之下。获救人质："," は銀河共和国の保護下に戻った。解放した人質："],
[". Il premio della missione è stato accreditato.",". The mission reward has been credited.",". La prime de mission a été créditée.",". El premio de la misión ha sido abonado.",". Награда за миссию начислена.","。任务奖励已入账。","。ミッション報酬を受け取った。"],
["I ribelli hanno respinto l’assalto. La colonia resiste ancora: riprova a liberarla.","The rebels repelled the assault. The colony is still holding out: try to free it again.","Les rebelles ont repoussé l’assaut. La colonie résiste encore : réessaie de la libérer.","Los rebeldes han rechazado el asalto. La colonia aún resiste: vuelve a intentar liberarla.","Мятежники отбили штурм. Колония ещё держится: попробуй освободить её снова.","叛军击退了进攻。殖民地仍在坚守：再试一次解放它。","反乱軍が攻撃を退けた。コロニーはまだ耐えている。もう一度解放を目指そう。"],
["TORNA ALLA MAPPA","BACK TO MAP","RETOUR À LA CARTE","VOLVER AL MAPA","НАЗАД К КАРТЕ","返回星图","マップに戻る"],
["NEMICI","ENEMIES","ENNEMIS","ENEMIGOS","ВРАГИ","敌人","敵"],
["SCAFO","HULL","COQUE","CASCO","КОРПУС","船体","船体"],
["LIBERA LA COLONIA · FASE 2","FREE THE COLONY · PHASE 2","LIBÈRE LA COLONIE · PHASE 2","LIBERA LA COLONIA · FASE 2","ОСВОБОДИ КОЛОНИЮ · ФАЗА 2","解放殖民地 · 第 2 阶段","コロニーを解放 · フェーズ 2"],
["ABBANDONA","ABANDON","ABANDONNER","ABANDONAR","ОТСТУПИТЬ","放弃","撤退"],
["ABBATTI IL ROBOT","TAKE DOWN THE ROBOT","ABATS LE ROBOT","DERRIBA EL ROBOT","УНИЧТОЖЬ РОБОТА","击倒机器人","ロボットを倒せ"],
["COLONIA SOTTO ATTACCO · AVANZA VERSO EST","COLONY UNDER ATTACK · PUSH EAST","COLONIE ATTAQUÉE · AVANCE VERS L’EST","COLONIA BAJO ATAQUE · AVANZA HACIA EL ESTE","КОЛОНИЯ АТАКОВАНА · ВПЕРЁД НА ВОСТОК","殖民地遭到攻击 · 向东推进","コロニー攻撃中 · 東へ進め"],
["ALLARME · ROBOT DA GUERRA IN ARRIVO","ALERT · WAR ROBOT INCOMING","ALERTE · ROBOT DE GUERRE EN APPROCHE","ALARMA · ROBOT DE GUERRA EN CAMINO","ТРЕВОГА · БОЕВОЙ РОБОТ ПРИБЛИЖАЕТСЯ","警报 · 战争机器人来袭","警報 · 戦闘ロボット接近"],
["GRANATE ESAURITE","OUT OF GRENADES","PLUS DE GRENADES","SIN GRANADAS","ГРАНАТЫ КОНЧИЛИСЬ","手雷用尽","手榴弾切れ"],
["CREDITI INSUFFICIENTI PER LA GRANATA","NOT ENOUGH CREDITS FOR THE GRENADE","CRÉDITS INSUFFISANTS POUR LA GRENADE","CRÉDITOS INSUFICIENTES PARA LA GRANADA","НЕ ХВАТАЕТ КРЕДИТОВ НА ГРАНАТУ","手雷所需积分不足","手榴弾のクレジット不足"],
["SCUDO ESAURITO","SHIELD DEPLETED","BOUCLIER ÉPUISÉ","ESCUDO AGOTADO","ЩИТ ИСЧЕРПАН","护盾耗尽","シールド切れ"],
[" · SALUTE −"," · HEALTH −"," · SANTÉ −"," · SALUD −"," · ЗДОРОВЬЕ −"," · 生命 −"," · 体力 −"],
["PILOTA RECUPERATO · VITE RIMASTE ","PILOT RECOVERED · LIVES LEFT ","PILOTE RÉCUPÉRÉ · VIES RESTANTES ","PILOTO RECUPERADO · VIDAS RESTANTES ","ПИЛОТ СПАСЁН · ОСТАЛОСЬ ЖИЗНЕЙ ","飞行员已回收 · 剩余生命 ","パイロット回収 · 残り "],
["PILOTA DI RISERVA IN ARRIVO · VITE RIMASTE ","BACKUP PILOT INBOUND · LIVES LEFT ","PILOTE DE RÉSERVE EN APPROCHE · VIES RESTANTES ","PILOTO DE RESERVA EN CAMINO · VIDAS RESTANTES ","РЕЗЕРВНЫЙ ПИЛОТ НА ПОДХОДЕ · ОСТАЛОСЬ ЖИЗНЕЙ ","后备飞行员即将抵达 · 剩余生命 ","予備パイロット降下中 · 残り "],
["KIT MEDICO · SALUTE +30%","MEDKIT · HEALTH +30%","TROUSSE MÉDICALE · SANTÉ +30%","BOTIQUÍN · SALUD +30%","АПТЕЧКА · ЗДОРОВЬЕ +30%","医疗包 · 生命 +30%","メディキット · 体力 +30%"],
["GRANATE +2","GRENADES +2","GRENADES +2","GRANADAS +2","ГРАНАТЫ +2","手雷 +2","手榴弾 +2"],
["CELLA SCUDO · +40%","SHIELD CELL · +40%","CELLULE DE BOUCLIER · +40%","CÉLULA DE ESCUDO · +40%","ЯЧЕЙКА ЩИТА · +40%","护盾电池 · +40%","シールドセル · +40%"],
["GRAZIE!","THANK YOU!","MERCI !","¡GRACIAS!","СПАСИБО!","谢谢！","ありがとう！"],
["COLONO SALVATO · ","COLONIST RESCUED · ","COLON SAUVÉ · ","COLONO RESCATADO · ","КОЛОНИСТ СПАСЁН · ","殖民者获救 · ","入植者救出 · "],
["PUNTO DI CONTROLLO","CHECKPOINT","POINT DE CONTRÔLE","PUNTO DE CONTROL","КОНТРОЛЬНАЯ ТОЧКА","检查点","チェックポイント"],
["CORRO ALLA NAVE!","RUNNING TO THE SHIP!","JE COURS AU VAISSEAU !","¡CORRO A LA NAVE!","БЕГУ К КОРАБЛЮ!","我跑向飞船！","船へ走る！"],
["LA REPUBBLICA INTERGALATTICA RINGRAZIA","THE INTERGALACTIC REPUBLIC THANKS YOU","LA RÉPUBLIQUE INTERGALACTIQUE TE REMERCIE","LA REPÚBLICA INTERGALÁCTICA TE LO AGRADECE","МЕЖГАЛАКТИЧЕСКАЯ РЕСПУБЛИКА БЛАГОДАРИТ","星际共和国向你致谢","銀河共和国より感謝を"],
[" · MODALITÀ FURIA"," · RAGE MODE"," · MODE FURIE"," · MODO FURIA"," · РЕЖИМ ЯРОСТИ"," · 狂暴模式"," · 激怒モード"],
["MODALITÀ FURIA","RAGE MODE","MODE FURIE","MODO FURIA","РЕЖИМ ЯРОСТИ","狂暴模式","激怒モード"],
["IL ROBOT LANCIA MISSILI · ABBATTILI IN VOLO","THE ROBOT FIRES MISSILES · SHOOT THEM DOWN","LE ROBOT TIRE DES MISSILES · ABATS-LES EN VOL","EL ROBOT LANZA MISILES · DERRÍBALOS EN VUELO","РОБОТ ПУСКАЕТ РАКЕТЫ · СБИВАЙ ИХ","机器人发射导弹 · 在空中击落它们","ロボットがミサイル発射 · 撃ち落とせ"],
["CARICA IN ARRIVO · SALTA COL JETPACK","CHARGE INCOMING · JUMP WITH THE JETPACK","CHARGE EN APPROCHE · SAUTE AVEC LE JETPACK","CARGA EN CAMINO · SALTA CON EL JETPACK","ТАРАН · ПРЫГАЙ НА ДЖЕТПАКЕ","冲锋来袭 · 用喷气背包跳起","突進が来る · ジェットパックで跳べ"],
["ONDA D’URTO · SALTA!","SHOCKWAVE · JUMP!","ONDE DE CHOC · SAUTE !","ONDA EXPANSIVA · ¡SALTA!","УДАРНАЯ ВОЛНА · ПРЫГАЙ!","冲击波 · 跳！","衝撃波 · 跳べ！"],
["NUCLEO ESPOSTO · DANNO DOPPIO","CORE EXPOSED · DOUBLE DAMAGE","NOYAU EXPOSÉ · DÉGÂTS DOUBLÉS","NÚCLEO EXPUESTO · DAÑO DOBLE","ЯДРО ОТКРЫТО · ДВОЙНОЙ УРОН","核心暴露 · 双倍伤害","コア露出 · ダメージ 2 倍"],
[" DISTRUTTO"," DESTROYED"," DÉTRUIT"," DESTRUIDO"," УНИЧТОЖЕН"," 已摧毁"," 撃破"],
["DISTRUGGI ","DESTROY ","DÉTRUIS ","DESTRUYE A ","УНИЧТОЖЬ ","摧毁 ","撃破せよ："],
["LIBERA I COLONI · RAGGIUNGI IL ROBOT","FREE THE COLONISTS · REACH THE ROBOT","LIBÈRE LES COLONS · ATTEINS LE ROBOT","LIBERA A LOS COLONOS · ALCANZA EL ROBOT","ОСВОБОДИ КОЛОНИСТОВ · ДОБЕРИСЬ ДО РОБОТА","解救殖民者 · 抵达机器人","入植者を解放 · ロボットへ向かえ"],
["RAGGIUNGI IL ROBOT","REACH THE ROBOT","ATTEINS LE ROBOT","ALCANZA EL ROBOT","ДОБЕРИСЬ ДО РОБОТА","抵达机器人","ロボットへ向かえ"],
["COLONIA ","COLONY ","COLONIE ","COLONIA ","КОЛОНИЯ ","殖民地 ","コロニー "],
["REPUBBLICA INTERGALATTICA · SETTORE HELIOS–7","INTERGALACTIC REPUBLIC · SECTOR HELIOS–7","RÉPUBLIQUE INTERGALACTIQUE · SECTEUR HELIOS–7","REPÚBLICA INTERGALÁCTICA · SECTOR HELIOS–7","МЕЖГАЛАКТИЧЕСКАЯ РЕСПУБЛИКА · СЕКТОР HELIOS–7","星际共和国 · HELIOS–7 星区","銀河共和国 · セクター HELIOS–7"],
["FRONTE OMBRA","SHADOW FRONT","FRONT DE L’OMBRE","FRENTE SOMBRA","ТЕНЕВОЙ ФРОНТ","暗影阵线","影の戦線"],
["CECCHINO","SNIPER","TIREUR D’ÉLITE","FRANCOTIRADOR","СНАЙПЕР","狙击手","狙撃兵"],
["AIUTO!","HELP!","À L’AIDE !","¡AYUDA!","ПОМОГИТЕ!","救命！","助けて！"],
["GRANCHIO CORAZZATO DEL FRONTE OMBRA","ARMORED CRAB OF THE SHADOW FRONT","CRABE BLINDÉ DU FRONT DE L’OMBRE","CANGREJO BLINDADO DEL FRENTE SOMBRA","БРОНИРОВАННЫЙ КРАБ ТЕНЕВОГО ФРОНТА","暗影阵线装甲蟹","影の戦線の装甲ガニ"],
["CACCIATORE DELLE DUNE","DUNE HUNTER","CHASSEUR DES DUNES","CAZADOR DE LAS DUNAS","ОХОТНИК ДЮН","沙丘猎手","砂丘の狩人"],
["SENTINELLA DELLA TEMPESTA","STORM SENTINEL","SENTINELLE DE LA TEMPÊTE","CENTINELA DE LA TORMENTA","СТРАЖ БУРИ","风暴哨兵","嵐の番兵"],
["COLOSSO DELLA FORESTA","FOREST COLOSSUS","COLOSSE DE LA FORÊT","COLOSO DEL BOSQUE","ЛЕСНОЙ КОЛОСС","森林巨像","森の巨像"],
["ROBOT DA GUERRA DEL FRONTE OMBRA","WAR ROBOT OF THE SHADOW FRONT","ROBOT DE GUERRE DU FRONT DE L’OMBRE","ROBOT DE GUERRA DEL FRENTE SOMBRA","БОЕВОЙ РОБОТ ТЕНЕВОГО ФРОНТА","暗影阵线战争机器人","影の戦線の戦闘ロボット"],
["JETPACK SURRISCALDATO · ATTENDI LA RICARICA","JETPACK OVERHEATED · WAIT FOR RECHARGE","JETPACK EN SURCHAUFFE · ATTENDS LA RECHARGE","JETPACK SOBRECALENTADO · ESPERA LA RECARGA","ДЖЕТПАК ПЕРЕГРЕТ · ЖДИ ПЕРЕЗАРЯДКИ","喷气背包过热 · 等待充能","ジェットパック過熱 · 充電待ち"],
["JETPACK PRONTO","JETPACK READY","JETPACK PRÊT","JETPACK LISTO","ДЖЕТПАК ГОТОВ","喷气背包就绪","ジェットパック準備完了"],
["LIBERI!","FREE!","LIBRES !","¡LIBRES!","СВОБОДНЫ!","自由了！","自由だ！"],
["LANCIATORE MULTIPLO","MULTI-LAUNCHER","LANCEUR MULTIPLE","LANZADOR MÚLTIPLE","МНОГОЗАРЯДНАЯ ПУСКОВАЯ","多重发射器","マルチランチャー"],
["Un clic della rotella lancia più missili insieme. Ogni missile costa 25 CR.","One wheel click launches several missiles at once. Each missile costs 25 CR.","Un clic de molette lance plusieurs missiles à la fois. Chaque missile coûte 25 CR.","Un clic de rueda lanza varios misiles a la vez. Cada misil cuesta 25 CR.","Один клик колёсиком запускает несколько ракет. Каждая ракета стоит 25 CR.","点击一次滚轮同时发射多枚导弹。每枚导弹 25 CR。","ホイールクリック 1 回で複数のミサイルを発射。1 発 25 CR。"],
["2 MISSILI INSIEME","2 MISSILES AT ONCE","2 MISSILES À LA FOIS","2 MISILES A LA VEZ","2 РАКЕТЫ СРАЗУ","同时 2 枚导弹","ミサイル 2 発同時"],
["3 MISSILI INSIEME","3 MISSILES AT ONCE","3 MISSILES À LA FOIS","3 MISILES A LA VEZ","3 РАКЕТЫ СРАЗУ","同时 3 枚导弹","ミサイル 3 発同時"],
["LASER POTENZIATO","UPGRADED LASER","LASER AMÉLIORÉ","LÁSER MEJORADO","УСИЛЕННЫЙ ЛАЗЕР","强化激光","強化レーザー"],
["Colpi più grossi e più potenti, nello spazio e a terra.","Bigger, stronger shots, in space and on the ground.","Des tirs plus gros et plus puissants, dans l’espace et au sol.","Disparos más grandes y potentes, en el espacio y en tierra.","Более крупные и мощные выстрелы в космосе и на земле.","更大更强的射击，太空和地面都适用。","宇宙でも地上でも、より大きく強力な射撃。"],
["DANNO +50%","DAMAGE +50%","DÉGÂTS +50%","DAÑO +50%","УРОН +50%","伤害 +50%","ダメージ +50%"],
["DANNO +100%","DAMAGE +100%","DÉGÂTS +100%","DAÑO +100%","УРОН +100%","伤害 +100%","ダメージ +100%"],
["DANNO +150%","DAMAGE +150%","DÉGÂTS +150%","DAÑO +150%","УРОН +150%","伤害 +150%","ダメージ +150%"],
["BARRIERA RINFORZATA","REINFORCED BARRIER","BARRIÈRE RENFORCÉE","BARRERA REFORZADA","УСИЛЕННЫЙ БАРЬЕР","强化屏障","強化バリア"],
["La barriera e lo scudo assorbono più colpi prima di esaurirsi.","The barrier and shield absorb more hits before running out.","La barrière et le bouclier encaissent plus de coups avant de s’épuiser.","La barrera y el escudo absorben más golpes antes de agotarse.","Барьер и щит выдерживают больше попаданий.","屏障和护盾在耗尽前能吸收更多攻击。","バリアとシールドがより多くの攻撃に耐える。"],
["RESISTENZA +35%","RESISTANCE +35%","RÉSISTANCE +35%","RESISTENCIA +35%","СТОЙКОСТЬ +35%","耐久 +35%","耐久 +35%"],
["RESISTENZA +70%","RESISTANCE +70%","RÉSISTANCE +70%","RESISTENCIA +70%","СТОЙКОСТЬ +70%","耐久 +70%","耐久 +70%"],
["RESISTENZA +105%","RESISTANCE +105%","RÉSISTANCE +105%","RESISTENCIA +105%","СТОЙКОСТЬ +105%","耐久 +105%","耐久 +105%"],
["MOTORI POTENZIATI","UPGRADED ENGINES","MOTEURS AMÉLIORÉS","MOTORES MEJORADOS","УСИЛЕННЫЕ ДВИГАТЕЛИ","强化引擎","強化エンジン"],
["La nave accelera e vola più veloce; il pilota corre più veloce.","The ship accelerates and flies faster; the pilot runs faster.","Le vaisseau accélère et vole plus vite ; le pilote court plus vite.","La nave acelera y vuela más rápido; el piloto corre más rápido.","Корабль разгоняется и летит быстрее, пилот бегает быстрее.","飞船加速更快、飞得更快；飞行员跑得更快。","艦船の加速と速度が上がり、パイロットも速く走る。"],
["VELOCITÀ +12%","SPEED +12%","VITESSE +12%","VELOCIDAD +12%","СКОРОСТЬ +12%","速度 +12%","速度 +12%"],
["VELOCITÀ +24%","SPEED +24%","VITESSE +24%","VELOCIDAD +24%","СКОРОСТЬ +24%","速度 +24%","速度 +24%"],
["VELOCITÀ +36%","SPEED +36%","VITESSE +36%","VELOCIDAD +36%","СКОРОСТЬ +36%","速度 +36%","速度 +36%"],
["INIETTORI EFFICIENTI","EFFICIENT INJECTORS","INJECTEURS EFFICACES","INYECTORES EFICIENTES","ЭКОНОМИЧНЫЕ ИНЖЕКТОРЫ","高效喷射器","高効率インジェクター"],
["CONSUMO −20%","CONSUMPTION −20%","CONSOMMATION −20%","CONSUMO −20%","РАСХОД −20%","消耗 −20%","消費 −20%"],
["CONSUMO −40%","CONSUMPTION −40%","CONSOMMATION −40%","CONSUMO −40%","РАСХОД −40%","消耗 −40%","消費 −40%"],
["CINTURA GRANATE","GRENADE BELT","CEINTURE DE GRENADES","CINTURÓN DE GRANADAS","ПОЯС С ГРАНАТАМИ","手雷腰带","手榴弾ベルト"],
["Granate in più all’inizio della fase 2.","Extra grenades at the start of phase 2.","Des grenades en plus au début de la phase 2.","Granadas extra al inicio de la fase 2.","Дополнительные гранаты в начале фазы 2.","第 2 阶段开始时额外获得手雷。","フェーズ 2 開始時に手榴弾を追加。"],
["+1 GRANATA","+1 GRENADE","+1 GRENADE","+1 GRANADA","+1 ГРАНАТА","+1 手雷","+1 手榴弾"],
["+3 GRANATE","+3 GRENADES","+3 GRENADES","+3 GRANADAS","+3 ГРАНАТЫ","+3 手雷","+3 手榴弾"],
["DOPPIO LASER","TWIN LASER","LASER DOUBLE","LÁSER DOBLE","ДВОЙНОЙ ЛАЗЕР","双联激光","ツインレーザー"],
["Spara due raggi paralleli a ogni colpo, nello spazio e a terra. Ogni colpo costa il doppio (2 CR).","Fires two parallel beams with every shot, in space and on the ground. Each shot costs double (2 CR).","Tire deux rayons parallèles à chaque coup, dans l’espace et au sol. Chaque tir coûte le double (2 CR).","Dispara dos rayos paralelos en cada disparo, en el espacio y en tierra. Cada disparo cuesta el doble (2 CR).","Каждый выстрел выпускает два параллельных луча в космосе и на земле. Выстрел стоит вдвое дороже (2 CR).","每次射击发出两道平行光束，太空和地面都适用。每次射击费用翻倍（2 CR）。","1 回の射撃で平行な 2 本のビームを撃つ。宇宙でも地上でも有効。射撃コストは 2 倍（2 CR）。"],
["COLPI LASER SPARATI","LASER SHOTS FIRED","TIRS LASER","DISPAROS LÁSER","ЛАЗЕРНЫХ ВЫСТРЕЛОВ","激光射击次数","レーザー発射数"],
["MISSILI LANCIATI","MISSILES LAUNCHED","MISSILES LANCÉS","MISILES LANZADOS","ЗАПУЩЕНО РАКЕТ","发射导弹数","ミサイル発射数"],
["CARBURANTE CONSUMATO","FUEL USED","CARBURANT CONSOMMÉ","COMBUSTIBLE GASTADO","ИЗРАСХОДОВАНО ТОПЛИВА","燃料消耗","燃料消費"],
["COLPI SPARATI","SHOTS FIRED","TIRS EFFECTUÉS","DISPAROS REALIZADOS","ВЫСТРЕЛОВ","射击次数","射撃数"],
["GRANATE LANCIATE","GRENADES THROWN","GRENADES LANCÉES","GRANADAS LANZADAS","БРОШЕНО ГРАНАТ","投掷手雷数","手榴弾使用数"],
["CARBURANTE DISCESA E JETPACK","DESCENT AND JETPACK FUEL","CARBURANT DESCENTE ET JETPACK","COMBUSTIBLE DE DESCENSO Y JETPACK","ТОПЛИВО СПУСКА И ДЖЕТПАКА","下降与喷气背包燃料","降下とジェットパックの燃料"],
["TAGLIA NEMICI ABBATTUTI","BOUNTY FOR ENEMIES DOWNED","PRIME POUR ENNEMIS ABATTUS","RECOMPENSA POR ENEMIGOS ABATIDOS","НАГРАДА ЗА СБИТЫХ ВРАГОВ","击落敌人赏金","撃破報奨金"],
["PREMIO MISSIONE · ","MISSION REWARD · ","PRIME DE MISSION · ","PREMIO DE LA MISIÓN · ","НАГРАДА ЗА МИССИЮ · ","任务奖励 · ","ミッション報酬 · "],
["BONUS OSTAGGI LIBERATI","FREED HOSTAGES BONUS","BONUS OTAGES LIBÉRÉS","BONUS POR REHENES LIBERADOS","БОНУС ЗА ЗАЛОЖНИКОВ","人质解救奖励","人質解放ボーナス"],
["MISSILE","MISSILE","MISSILE","MISIL","РАКЕТА","导弹","ミサイル"],
["GRANATA","GRENADE","GRENADE","GRANADA","ГРАНАТА","手雷","手榴弾"],
["CARBURANTE","FUEL","CARBURANT","COMBUSTIBLE","ТОПЛИВО","燃料","燃料"],
["SPESI IN QUESTA FASE −","SPENT THIS PHASE −","DÉPENSÉS DANS CETTE PHASE −","GASTADOS EN ESTA FASE −","ПОТРАЧЕНО В ЭТОЙ ФАЗЕ −","本阶段花费 −","このフェーズの支出 −"],
["RIEPILOGO CREDITI · FASE ","CREDIT SUMMARY · PHASE ","BILAN DES CRÉDITS · PHASE ","RESUMEN DE CRÉDITOS · FASE ","СВОДКА КРЕДИТОВ · ФАЗА ","积分汇总 · 第 ","クレジット集計 · フェーズ "],
["TOTALE FASE","PHASE TOTAL","TOTAL DE LA PHASE","TOTAL DE LA FASE","ИТОГО ЗА ФАЗУ","阶段合计","フェーズ合計"],
["SALDO ATTUALE","CURRENT BALANCE","SOLDE ACTUEL","SALDO ACTUAL","ТЕКУЩИЙ БАЛАНС","当前余额","現在の残高"],
["Il premio della missione si ottiene liberando la colonia e distruggendo il robot finale.","The mission reward is earned by freeing the colony and destroying the final robot.","La prime de mission s’obtient en libérant la colonie et en détruisant le robot final.","El premio de la misión se obtiene liberando la colonia y destruyendo el robot final.","Награда за миссию выдаётся за освобождение колонии и уничтожение финального робота.","解放殖民地并摧毁最终机器人即可获得任务奖励。","ミッション報酬はコロニーを解放し最後のロボットを倒すと得られる。"],
["Il premio della missione arriva in fase 2: libera gli ostaggi e distruggi il robot finale.","The mission reward comes in phase 2: free the hostages and destroy the final robot.","La prime de mission arrive en phase 2 : libère les otages et détruis le robot final.","El premio de la misión llega en la fase 2: libera a los rehenes y destruye el robot final.","Награда за миссию — в фазе 2: освободи заложников и уничтожь финального робота.","任务奖励在第 2 阶段发放：解救人质并摧毁最终机器人。","ミッション報酬はフェーズ 2 で。人質を解放し最後のロボットを倒せ。"],
["CREDITI INSUFFICIENTI","NOT ENOUGH CREDITS","CRÉDITS INSUFFISANTS","CRÉDITOS INSUFICIENTES","НЕДОСТАТОЧНО КРЕДИТОВ","积分不足","クレジット不足"],
["ACQUISTATO · ","PURCHASED · ","ACHETÉ · ","COMPRADO · ","КУПЛЕНО · ","已购买 · ","購入済 · "],
["ATTUALE: ","CURRENT: ","ACTUEL : ","ACTUAL: ","СЕЙЧАС: ","当前：","現在："],
["NON ACQUISTATO","NOT PURCHASED","NON ACHETÉ","NO COMPRADO","НЕ КУПЛЕНО","未购买","未購入"],
["LIVELLO MASSIMO","MAX LEVEL","NIVEAU MAXIMUM","NIVEL MÁXIMO","МАКС. УРОВЕНЬ","最高等级","最大レベル"],
["VITE ","LIVES ","VIES ","VIDAS ","ЖИЗНИ ","生命 ","残機 "],
["HAI PERSO TUTTE LE VITE","YOU LOST ALL YOUR LIVES","TU AS PERDU TOUTES TES VIES","HAS PERDIDO TODAS LAS VIDAS","ТЫ ПОТЕРЯЛ ВСЕ ЖИЗНИ","你失去了所有生命","残機がなくなった"],
["Il Fronte Ombra ha vinto questa guerra. Si riparte da capo: crediti, potenziamenti e pianeti liberati sono azzerati e hai di nuovo 3 vite.","The Shadow Front has won this war. You start over: credits, upgrades and freed planets are reset and you have 3 lives again.","Le Front de l’Ombre a gagné cette guerre. Tout recommence : crédits, améliorations et planètes libérées sont remis à zéro et tu as de nouveau 3 vies.","El Frente Sombra ha ganado esta guerra. Empiezas de cero: créditos, mejoras y planetas liberados se reinician y vuelves a tener 3 vidas.","Теневой фронт выиграл эту войну. Всё начинается заново: кредиты, улучшения и освобождённые планеты сброшены, у тебя снова 3 жизни.","暗影阵线赢得了这场战争。一切从头开始：积分、升级和已解放的星球全部清零，你重新拥有 3 条生命。","影の戦線がこの戦争に勝利した。最初からやり直し：クレジット、強化、解放した惑星はリセットされ、残機は再び 3。"],
["RICOMINCIA DALLA MAPPA","RESTART FROM THE MAP","RECOMMENCER DEPUIS LA CARTE","EMPEZAR DE NUEVO DESDE EL MAPA","НАЧАТЬ ЗАНОВО С КАРТЫ","从星图重新开始","マップからやり直す"],
[" Hai perso una vita: ne restano "," You lost a life. Lives left: "," Tu as perdu une vie. Vies restantes : "," Has perdido una vida. Vidas restantes: "," Ты потерял жизнь. Осталось жизней: "," 你失去了一条生命。剩余生命："," 残機を 1 つ失った。残り："],
["LIFEUP · VITA EXTRA · VITE ","LIFEUP · EXTRA LIFE · LIVES ","LIFEUP · VIE SUPPLÉMENTAIRE · VIES ","LIFEUP · VIDA EXTRA · VIDAS ","LIFEUP · ДОП. ЖИЗНЬ · ЖИЗНИ ","LIFEUP · 额外生命 · 生命 ","LIFEUP · 1UP · 残機 "],
["LIFEUP · VITA EXTRA","LIFEUP · EXTRA LIFE","LIFEUP · VIE SUPPLÉMENTAIRE","LIFEUP · VIDA EXTRA","LIFEUP · ДОП. ЖИЗНЬ","LIFEUP · 额外生命","LIFEUP · 1UP"],
["+1 VITA","+1 LIFE","+1 VIE","+1 VIDA","+1 ЖИЗНЬ","+1 生命","+1 残機"],
["APOCALITTICA","APOCALYPTIC","APOCALYPTIQUE","APOCALÍPTICA","АПОКАЛИПТИЧЕСКАЯ","末日级","黙示録級"],
["La cittadella del Fronte Ombra, sospesa sopra un abisso cremisi. Qui si decide il destino della Repubblica.","The Shadow Front citadel, suspended over a crimson abyss. Here the fate of the Republic will be decided.","La citadelle du Front de l’Ombre, suspendue au-dessus d’un abîme pourpre. Ici se joue le destin de la République.","La ciudadela del Frente Sombra, suspendida sobre un abismo carmesí. Aquí se decide el destino de la República.","Цитадель Теневого фронта над багровой бездной. Здесь решится судьба Республики.","悬于深红深渊之上的暗影阵线要塞。共和国的命运将在此决定。","深紅の深淵の上に浮かぶ影の戦線の城塞。ここで共和国の運命が決まる。"],
["LA REPUBBLICA È SALVA","THE REPUBLIC IS SAVED","LA RÉPUBLIQUE EST SAUVÉE","LA REPÚBLICA ESTÁ A SALVO","РЕСПУБЛИКА СПАСЕНА","共和国得救了","共和国は救われた"],
["IMPERATORE OMEGA è caduto e il Fronte Ombra è sconfitto. La Repubblica Intergalattica è salva: sei una leggenda.","EMPEROR OMEGA has fallen and the Shadow Front is defeated. The Intergalactic Republic is saved: you are a legend.","L’EMPEREUR OMEGA est tombé et le Front de l’Ombre est vaincu. La République intergalactique est sauvée : tu es une légende.","El EMPERADOR OMEGA ha caído y el Frente Sombra está derrotado. La República Intergaláctica está a salvo: eres una leyenda.","ИМПЕРАТОР ОМЕГА пал, Теневой фронт разбит. Межгалактическая республика спасена: ты легенда.","欧米伽皇帝已倒下，暗影阵线被击溃。星际共和国得救了：你是传奇。","皇帝オメガは倒れ、影の戦線は敗北した。銀河共和国は救われた。君は伝説だ。"],
[" TUTTI I PIANETI SONO LIBERI: SI È SBLOCCATO IL PIANETA FINALE OMEGA."," ALL PLANETS ARE FREE: THE FINAL PLANET OMEGA IS UNLOCKED."," TOUTES LES PLANÈTES SONT LIBRES : LA PLANÈTE FINALE OMEGA EST DÉBLOQUÉE."," TODOS LOS PLANETAS ESTÁN LIBRES: SE HA DESBLOQUEADO EL PLANETA FINAL OMEGA."," ВСЕ ПЛАНЕТЫ СВОБОДНЫ: ОТКРЫТА ФИНАЛЬНАЯ ПЛАНЕТА OMEGA."," 所有星球均已解放：最终星球 OMEGA 已解锁。"," 全惑星を解放：最終惑星 OMEGA が解禁された。"],
[" Pianeti liberati: "," Planets freed: "," Planètes libérées : "," Planetas liberados: "," Освобождено планет: "," 已解放星球："," 解放した惑星："],
["ABISSO","ABYSS","ABÎME","ABISMO","БЕЗДНА","深渊","深淵"],
["La cittadella del Fronte Ombra galleggia sopra un abisso cremisi: sotto le piattaforme c’è il vuoto.","The Shadow Front citadel floats over a crimson abyss: below the platforms there is only void.","La citadelle du Front de l’Ombre flotte au-dessus d’un abîme pourpre : sous les plateformes, c’est le vide.","La ciudadela del Frente Sombra flota sobre un abismo carmesí: bajo las plataformas está el vacío.","Цитадель Теневого фронта парит над багровой бездной: под платформами пустота.","暗影阵线要塞漂浮在深红深渊之上：平台下方是虚空。","影の戦線の城塞は深紅の深淵に浮かぶ。足場の下は虚空だ。"],
["CITTADELLA OMEGA · ULTIMA BATTAGLIA","OMEGA CITADEL · FINAL BATTLE","CITADELLE OMEGA · DERNIÈRE BATAILLE","CIUDADELA OMEGA · BATALLA FINAL","ЦИТАДЕЛЬ OMEGA · ПОСЛЕДНЯЯ БИТВА","OMEGA 要塞 · 最终之战","OMEGA 城塞 · 最終決戦"],
["PRECIPITATO NELL’ABISSO","FELL INTO THE ABYSS","TOMBÉ DANS L’ABÎME","CAÍDO AL ABISMO","УПАЛ В БЕЗДНУ","坠入深渊","深淵に転落"],
["IMPERATORE OMEGA","EMPEROR OMEGA","EMPEREUR OMEGA","EMPERADOR OMEGA","ИМПЕРАТОР ОМЕГА","欧米伽皇帝","皇帝オメガ"],
["SIGNORE DEL FRONTE OMBRA","LORD OF THE SHADOW FRONT","SEIGNEUR DU FRONT DE L’OMBRE","SEÑOR DEL FRENTE SOMBRA","ВЛАДЫКА ТЕНЕВОГО ФРОНТА","暗影阵线之主","影の戦線の支配者"],
["il signore del Fronte Ombra nella sua armatura da guerra","the lord of the Shadow Front in his war armor","le seigneur du Front de l’Ombre dans son armure de guerre","el señor del Frente Sombra con su armadura de guerra","владыка Теневого фронта в боевой броне","身披战甲的暗影阵线之主","戦闘鎧をまとった影の戦線の支配者"],
["ATTIVA","ON","ACTIVÉE","ACTIVADA","ВКЛ","开启","オン"],
["DISATTIVATA","OFF","DÉSACTIVÉE","DESACTIVADA","ВЫКЛ","关闭","オフ"],
["MUSICA ATTIVA","MUSIC ON","MUSIQUE ACTIVÉE","MÚSICA ACTIVADA","МУЗЫКА ВКЛ","音乐开启","音楽オン"],
["MUSICA DISATTIVATA","MUSIC OFF","MUSIQUE DÉSACTIVÉE","MÚSICA DESACTIVADA","МУЗЫКА ВЫКЛ","音乐关闭","音楽オフ"],
["Area di gioco spaziale","Space play area","Zone de jeu spatiale","Área de juego espacial","Игровое поле","太空游戏区域","宇宙のプレイエリア"],
["Mappa stellare","Star map","Carte stellaire","Mapa estelar","Звёздная карта","星图","星図"],
["Crediti disponibili","Available credits","Crédits disponibles","Créditos disponibles","Доступные кредиты","可用积分","利用可能クレジット"],
["CREDITI","CREDITS","CRÉDITS","CRÉDITOS","КРЕДИТЫ","积分","クレジット"],
["Apri il mercato","Open the market","Ouvrir le marché","Abrir el mercado","Открыть рынок","打开商店","マーケットを開く"],
["MERCATO","MARKET","MARCHÉ","MERCADO","РЫНОК","商店","マーケット"],
["Apri impostazioni","Open settings","Ouvrir les paramètres","Abrir ajustes","Открыть настройки","打开设置","設定を開く"],
["IMPOSTAZIONI","SETTINGS","PARAMÈTRES","AJUSTES","НАСТРОЙКИ","设置","設定"],
["SETTORE","SECTOR","SECTEUR","SECTOR","СЕКТОР","星区","セクター"],
["COMANDO DELLA FLOTTA // FASE 1","FLEET COMMAND // PHASE 1","COMMANDEMENT DE LA FLOTTE // PHASE 1","MANDO DE LA FLOTA // FASE 1","КОМАНДОВАНИЕ ФЛОТА // ФАЗА 1","舰队指挥部 // 第 1 阶段","艦隊司令部 // フェーズ 1"],
["Scegli la tua","Choose your","Choisis ta","Elige tu","Выбери свою","选择你的","次の"],
["prossima conquista.","next conquest.","prochaine conquête.","próxima conquista.","следующую цель.","下一个征服目标。","征服先を選べ。"],
["Ogni mondo nasconde una rotta diversa. Studia il rischio, prepara i sistemi e attraversa il blocco orbitale.","Every world hides a different route. Study the risk, prepare your systems and break through the orbital blockade.","Chaque monde cache une route différente. Étudie le risque, prépare tes systèmes et traverse le blocus orbital.","Cada mundo esconde una ruta distinta. Estudia el riesgo, prepara los sistemas y atraviesa el bloqueo orbital.","Каждый мир скрывает свой маршрут. Оцени риск, подготовь системы и прорви орбитальную блокаду.","每个世界都藏着不同的航线。评估风险，准备系统，突破轨道封锁。","どの世界にも異なる航路がある。危険を見極め、システムを整え、軌道封鎖を突破せよ。"],
["ROTTE DISPONIBILI · SISTEMI PRONTI","ROUTES AVAILABLE · SYSTEMS READY","ROUTES DISPONIBLES · SYSTÈMES PRÊTS","RUTAS DISPONIBLES · SISTEMAS LISTOS","МАРШРУТЫ ДОСТУПНЫ · СИСТЕМЫ ГОТОВЫ","航线可用 · 系统就绪","航路使用可能 · システム準備完了"],
["Basso","Low","Faible","Bajo","Низкий","低","低"],
["Medio","Medium","Moyen","Medio","Средний","中","中"],
["Estremo","Extreme","Extrême","Extremo","Экстремальный","极端","極限"],
["Selezione pianeta","Planet selection","Choix de la planète","Selección de planeta","Выбор планеты","选择星球","惑星選択"],
["OBIETTIVO SELEZIONATO","SELECTED TARGET","OBJECTIF SÉLECTIONNÉ","OBJETIVO SELECCIONADO","ВЫБРАННАЯ ЦЕЛЬ","已选目标","選択中の目標"],
["DISTANZA","DISTANCE","DISTANCE","DISTANCIA","РАССТОЯНИЕ","距离","距離"],
["MINACCIA","THREAT","MENACE","AMENAZA","УГРОЗА","威胁","脅威"],
["RICOMPENSA","REWARD","RÉCOMPENSE","RECOMPENSA","НАГРАДА","奖励","報酬"],
["INIZIA LA MISSIONE","START MISSION","COMMENCER LA MISSION","INICIAR LA MISIÓN","НАЧАТЬ МИССИЮ","开始任务","ミッション開始"],
["FRECCE / WASD per muoverti · MOUSE per puntare la prua","ARROWS / WASD to move · MOUSE to aim the bow","FLÈCHES / WASD pour bouger · SOURIS pour orienter la proue","FLECHAS / WASD para moverte · RATÓN para apuntar la proa","СТРЕЛКИ / WASD — движение · МЫШЬ — наведение носа","方向键 / WASD 移动 · 鼠标 瞄准船头","矢印 / WASD で移動 · マウス で艦首を向ける"],
["FASE 2 · ATTERRA SUL PIANETA SELEZIONATO ⤓","PHASE 2 · LAND ON THE SELECTED PLANET ⤓","PHASE 2 · ATTERRIR SUR LA PLANÈTE CHOISIE ⤓","FASE 2 · ATERRIZA EN EL PLANETA ELEGIDO ⤓","ФАЗА 2 · ВЫСАДКА НА ВЫБРАННУЮ ПЛАНЕТУ ⤓","第 2 阶段 · 降落在所选星球 ⤓","フェーズ 2 · 選択した惑星に着陸 ⤓"],
["COORDINATE BLOCCATE","COORDINATES LOCKED","COORDONNÉES VERROUILLÉES","COORDENADAS FIJADAS","КООРДИНАТЫ ЗАДАНЫ","坐标已锁定","座標固定"],
["Esci dall’iperspazio, supera le difese e raggiungi l’orbita del pianeta.","Drop out of hyperspace, get past the defenses and reach the planet’s orbit.","Sors de l’hyperespace, franchis les défenses et atteins l’orbite de la planète.","Sal del hiperespacio, supera las defensas y alcanza la órbita del planeta.","Выйди из гиперпространства, прорвись через оборону и выйди на орбиту планеты.","退出超空间，突破防线，抵达星球轨道。","ハイパースペースを抜け、防衛線を突破して惑星の軌道へ到達せよ。"],
["INGAGGIA IPERSPAZIO","ENGAGE HYPERSPACE","ENCLENCHER L’HYPERESPACE","ACTIVAR HIPERESPACIO","ВКЛЮЧИТЬ ГИПЕРПРЫЖОК","启动超空间","ハイパースペース突入"],
["Impostazioni","Settings","Paramètres","Ajustes","Настройки","设置","設定"],
["CONFIGURAZIONE DI VOLO","FLIGHT SETUP","CONFIGURATION DE VOL","CONFIGURACIÓN DE VUELO","НАСТРОЙКИ ПОЛЁТА","飞行配置","フライト設定"],
["Chiudi impostazioni","Close settings","Fermer les paramètres","Cerrar ajustes","Закрыть настройки","关闭设置","設定を閉じる"],
["SCHEMA COMANDI","CONTROLS","COMMANDES","CONTROLES","УПРАВЛЕНИЕ","操作方式","操作方法"],
["MIRA CON IL MOUSE","AIM WITH THE MOUSE","VISÉE À LA SOURIS","APUNTAR CON EL RATÓN","ПРИЦЕЛ МЫШЬЮ","鼠标瞄准","マウスで照準"],
["La prua della nave segue il cursore del mouse: punta dove vuoi sparare. Le frecce spostano la nave nella direzione dello schermo (su = su, giù = giù, sinistra = sinistra, destra = destra), indipendentemente da dove guarda la prua. Dopo un impatto i comandi restano sospesi per un istante. La cintura rocciosa vicino al pianeta forma un labirinto. Gli urti consumano molta barriera e i frammenti delle rocce distrutte possono colpirti.","The ship’s bow follows the mouse cursor: point where you want to shoot. The arrows move the ship in screen directions (up = up, down = down, left = left, right = right), no matter where the bow is facing. After an impact the controls freeze for a moment. The rock belt near the planet forms a maze. Collisions drain a lot of barrier and fragments of destroyed rocks can hit you.","La proue du vaisseau suit le curseur de la souris : vise là où tu veux tirer. Les flèches déplacent le vaisseau selon l’écran (haut = haut, bas = bas, gauche = gauche, droite = droite), quelle que soit l’orientation de la proue. Après un impact, les commandes sont suspendues un instant. La ceinture rocheuse près de la planète forme un labyrinthe. Les chocs consomment beaucoup de barrière et les fragments des roches détruites peuvent te toucher.","La proa de la nave sigue al cursor del ratón: apunta donde quieras disparar. Las flechas mueven la nave según la pantalla (arriba = arriba, abajo = abajo, izquierda = izquierda, derecha = derecha), mire donde mire la proa. Tras un impacto los controles quedan suspendidos un instante. El cinturón de rocas cerca del planeta forma un laberinto. Los choques gastan mucha barrera y los fragmentos de las rocas destruidas pueden golpearte.","Нос корабля следует за курсором мыши: наводи туда, куда хочешь стрелять. Стрелки двигают корабль по направлениям экрана (вверх = вверх, вниз = вниз, влево = влево, вправо = вправо), куда бы ни смотрел нос. После удара управление на мгновение пропадает. Каменный пояс у планеты образует лабиринт. Столкновения сильно тратят барьер, а осколки разрушенных камней могут попасть в тебя.","船头会跟随鼠标光标：指向你想射击的位置。方向键按屏幕方向移动飞船（上 = 上，下 = 下，左 = 左，右 = 右），与船头朝向无关。受到撞击后操控会短暂停顿。星球附近的岩石带形成迷宫。碰撞会大量消耗屏障，被摧毁岩石的碎片也可能击中你。","艦首はマウスカーソルを追う。撃ちたい方向に向けよう。矢印キーは艦首の向きに関係なく画面の方向（上 = 上、下 = 下、左 = 左、右 = 右）に艦船を動かす。衝突の後は一瞬操作できなくなる。惑星近くの岩石帯は迷路になっている。衝突はバリアを大きく消費し、壊れた岩の破片が当たることもある。"],
["ROTELLA","WHEEL","MOLETTE","RUEDA","КОЛЁСИКО","滚轮","ホイール"],
["Clic centrale · uno in volo · guidato se agganciato; aggancio mantenuto finché visibile","Middle click · one in flight · homing if locked; lock kept while visible","Clic central · un en vol · guidé si verrouillé ; verrouillage gardé tant que visible","Clic central · uno en vuelo · guiado si está fijado; se mantiene mientras sea visible","Средний клик · одна в полёте · наводится при захвате; захват держится, пока цель видна","中键点击 · 同时一枚 · 锁定后自动制导；目标可见时保持锁定","中クリック · 同時に 1 発 · ロック時は誘導、見えている間ロック維持"],
["FRENO","BRAKE","FREIN","FRENO","ТОРМОЗ","刹车","ブレーキ"],
["Rallenta per conquistare l’orbita","Slow down to conquer orbit","Ralentis pour conquérir l’orbite","Frena para conquistar la órbita","Замедлись, чтобы захватить орбиту","减速以占领轨道","減速して軌道を制圧"],
["PAUSA","PAUSE","PAUSE","PAUSA","ПАУЗА","暂停","ポーズ"],
["Sospendi la missione","Pause the mission","Suspendre la mission","Pausar la misión","Приостановить миссию","暂停任务","ミッションを一時停止"],
["SU","UP","HAUT","ARRIBA","ВВЕРХ","上","上"],
["Verso l’alto dello schermo","Toward the top of the screen","Vers le haut de l’écran","Hacia arriba de la pantalla","К верху экрана","朝屏幕上方","画面の上へ"],
["GIÙ","DOWN","BAS","ABAJO","ВНИЗ","下","下"],
["Verso il basso dello schermo","Toward the bottom of the screen","Vers le bas de l’écran","Hacia abajo de la pantalla","К низу экрана","朝屏幕下方","画面の下へ"],
["Verso sinistra, qualunque sia la prua","To the left, whatever the bow","Vers la gauche, quelle que soit la proue","Hacia la izquierda, sea cual sea la proa","Влево, куда бы ни смотрел нос","向左，与船头朝向无关","艦首の向きに関係なく左へ"],
["Verso destra, qualunque sia la prua","To the right, whatever the bow","Vers la droite, quelle que soit la proue","Hacia la derecha, sea cual sea la proa","Вправо, куда бы ни смотрел нос","向右，与船头朝向无关","艦首の向きに関係なく右へ"],
["SPAZIO","SPACE","ESPACE","ESPACIO","ПРОБЕЛ","空格","スペース"],
["FUOCO","FIRE","FEU","FUEGO","ОГОНЬ","开火","射撃"],
["Cannoni principali","Main cannons","Canons principaux","Cañones principales","Основные орудия","主炮","主砲"],
["POST-BRUCIATORE","AFTERBURNER","POSTCOMBUSTION","POSCOMBUSTIÓN","ФОРСАЖ","加力","アフターバーナー"],
["Si riattiva solo al 100%","Reactivates only at 100%","Se réactive seulement à 100 %","Solo se reactiva al 100%","Включается снова только на 100%","充满 100% 才能再次启用","100% で再使用可能"],
["BARRIERA","BARRIER","BARRIÈRE","BARRERA","БАРЬЕР","屏障","バリア"],
["Resta attiva negli urti, che consumano energia; capsule azzurre: +35%","Stays on during collisions, which drain energy; blue capsules: +35%","Reste active pendant les chocs, qui consomment de l’énergie ; capsules bleues : +35 %","Sigue activa en los choques, que gastan energía; cápsulas azules: +35%","Работает при столкновениях, которые тратят энергию; голубые капсулы: +35%","碰撞时保持开启，但会消耗能量；蓝色胶囊：+35%","衝突中も有効だがエネルギーを消費。青いカプセル：+35%"],
["AUDIO DI BORDO","ON-BOARD AUDIO","AUDIO DE BORD","AUDIO DE A BORDO","БОРТОВОЙ ЗВУК","舰载音效","効果音"],
["Effetti di armi, impatti e iperspazio.","Weapon, impact and hyperspace effects.","Effets des armes, des impacts et de l’hyperespace.","Efectos de armas, impactos e hiperespacio.","Звуки оружия, ударов и гиперпространства.","武器、撞击和超空间音效。","武器、衝撃、ハイパースペースの効果音。"],
["COLONNA SONORA","SOUNDTRACK","BANDE-SON","BANDA SONORA","САУНДТРЕК","配乐","サウンドトラック"],
["VOLUME","VOLUME","VOLUME","VOLUMEN","ГРОМКОСТЬ","音量","音量"],
["Volume effetti sonori","Sound effects volume","Volume des effets sonores","Volumen de los efectos","Громкость эффектов","音效音量","効果音の音量"],
["Volume musica","Music volume","Volume de la musique","Volumen de la música","Громкость музыки","音乐音量","音楽の音量"],
["Musica di sottofondo che cambia con l’azione (tasto","Background music that follows the action (key","Musique de fond qui suit l’action (touche","Música de fondo que cambia con la acción (tecla","Фоновая музыка меняется вместе с действием (клавиша","随战斗变化的背景音乐（按键","展開に合わせて変わる BGM（キー"],
["SALVA E CHIUDI","SAVE AND CLOSE","ENREGISTRER ET FERMER","GUARDAR Y CERRAR","СОХРАНИТЬ И ЗАКРЫТЬ","保存并关闭","保存して閉じる"],
["Interfaccia di volo","Flight interface","Interface de vol","Interfaz de vuelo","Интерфейс полёта","飞行界面","フライト画面"],
["OBIETTIVO","TARGET","OBJECTIF","OBJETIVO","ЦЕЛЬ","目标","目標"],
["Direzione obiettivo","Target direction","Direction de l’objectif","Dirección del objetivo","Направление цели","目标方向","目標の方向"],
["DISTANZA OBIETTIVO","TARGET DISTANCE","DISTANCE DE L’OBJECTIF","DISTANCIA AL OBJETIVO","РАССТОЯНИЕ ДО ЦЕЛИ","目标距离","目標までの距離"],
["Pausa","Pause","Pause","Pausa","Пауза","暂停","ポーズ"],
["MISSILE PRONTO · CLIC ROTELLA","MISSILE READY · WHEEL CLICK","MISSILE PRÊT · CLIC MOLETTE","MISIL LISTO · CLIC RUEDA","РАКЕТА ГОТОВА · КЛИК КОЛЁСИКОМ","导弹就绪 · 点击滚轮","ミサイル準備完了 · ホイールクリック"],
["POST-BRUCIATORE · SHIFT DX","AFTERBURNER · RIGHT SHIFT","POSTCOMBUSTION · MAJ DROITE","POSCOMBUSTIÓN · MAYÚS DCHA","ФОРСАЖ · ПРАВЫЙ SHIFT","加力 · 右 SHIFT","アフターバーナー · 右 SHIFT"],
["BARRIERA · MOUSE DX","BARRIER · RIGHT MOUSE","BARRIÈRE · CLIC DROIT","BARRERA · BOTÓN DERECHO","БАРЬЕР · ПРАВАЯ КНОПКА","屏障 · 鼠标右键","バリア · 右クリック"],
["FRECCE / WASD muovi · MOUSE punta la prua · SHIFT DX post-bruciatore · MOUSE DX barriera · clic / SPAZIO spara · ROTELLA missile · F frena · P pausa","ARROWS / WASD move · MOUSE aim the bow · RIGHT SHIFT afterburner · RIGHT MOUSE barrier · click / SPACE fire · WHEEL missile · F brake · P pause","FLÈCHES / WASD bouger · SOURIS orienter la proue · MAJ DROITE postcombustion · CLIC DROIT barrière · clic / ESPACE tirer · MOLETTE missile · F freiner · P pause","FLECHAS / WASD mover · RATÓN apuntar la proa · MAYÚS DCHA poscombustión · BOTÓN DERECHO barrera · clic / ESPACIO disparar · RUEDA misil · F frenar · P pausa","СТРЕЛКИ / WASD движение · МЫШЬ наведение · ПРАВЫЙ SHIFT форсаж · ПРАВАЯ КНОПКА барьер · клик / ПРОБЕЛ огонь · КОЛЁСИКО ракета · F тормоз · P пауза","方向键 / WASD 移动 · 鼠标 瞄准 · 右 SHIFT 加力 · 鼠标右键 屏障 · 点击 / 空格 开火 · 滚轮 导弹 · F 刹车 · P 暂停","矢印 / WASD 移動 · マウス 照準 · 右 SHIFT アフターバーナー · 右クリック バリア · クリック / スペース 射撃 · ホイール ミサイル · F ブレーキ · P ポーズ"],
["SIMULAZIONE SOSPESA","SIMULATION PAUSED","SIMULATION SUSPENDUE","SIMULACIÓN EN PAUSA","СИМУЛЯЦИЯ ПРИОСТАНОВЛЕНА","模拟已暂停","シミュレーション一時停止"],
["RIPRENDI","RESUME","REPRENDRE","CONTINUAR","ПРОДОЛЖИТЬ","继续","再開"],
["ABBANDONA MISSIONE","ABANDON MISSION","ABANDONNER LA MISSION","ABANDONAR MISIÓN","ПОКИНУТЬ МИССИЮ","放弃任务","ミッション放棄"],
["ATTERRA SUL PIANETA · FASE 2","LAND ON THE PLANET · PHASE 2","ATTERRIR SUR LA PLANÈTE · PHASE 2","ATERRIZA EN EL PLANETA · FASE 2","ВЫСАДКА НА ПЛАНЕТУ · ФАЗА 2","降落星球 · 第 2 阶段","惑星に着陸 · フェーズ 2"],
["⛁ APRI IL MERCATO · POTENZIAMENTI","⛁ OPEN THE MARKET · UPGRADES","⛁ OUVRIR LE MARCHÉ · AMÉLIORATIONS","⛁ ABRIR EL MERCADO · MEJORAS","⛁ ОТКРЫТЬ РЫНОК · УЛУЧШЕНИЯ","⛁ 打开商店 · 升级","⛁ マーケットを開く · 強化"],
["FASE 2 // DISCESA IN SUPERFICIE","PHASE 2 // DESCENT TO THE SURFACE","PHASE 2 // DESCENTE EN SURFACE","FASE 2 // DESCENSO A LA SUPERFICIE","ФАЗА 2 // СПУСК НА ПОВЕРХНОСТЬ","第 2 阶段 // 降落地表","フェーズ 2 // 地表へ降下"],
["A / D muovi · W / SPAZIO salta · S abbassati · MOUSE mira · CLIC spara · ROTELLA o E granata · MOUSE DX scudo","A / D move · W / SPACE jump · S crouch · MOUSE aim · CLICK fire · WHEEL or E grenade · RIGHT MOUSE shield","A / D bouger · W / ESPACE sauter · S s’accroupir · SOURIS viser · CLIC tirer · MOLETTE ou E grenade · CLIC DROIT bouclier","A / D mover · W / ESPACIO saltar · S agacharse · RATÓN apuntar · CLIC disparar · RUEDA o E granada · BOTÓN DERECHO escudo","A / D движение · W / ПРОБЕЛ прыжок · S пригнуться · МЫШЬ прицел · КЛИК огонь · КОЛЁСИКО или E граната · ПРАВАЯ КНОПКА щит","A / D 移动 · W / 空格 跳跃 · S 蹲下 · 鼠标 瞄准 · 点击 射击 · 滚轮 或 E 手雷 · 鼠标右键 护盾","A / D 移動 · W / スペース ジャンプ · S しゃがむ · マウス 照準 · クリック 射撃 · ホイール または E 手榴弾 · 右クリック シールド"],
["SCENDI IN SUPERFICIE","DESCEND TO THE SURFACE","DESCENDRE EN SURFACE","BAJAR A LA SUPERFICIE","СПУСТИТЬСЯ НА ПОВЕРХНОСТЬ","降落地表","地表へ降下"],
["Interfaccia missione a terra","Ground mission interface","Interface de mission au sol","Interfaz de misión en tierra","Интерфейс наземной миссии","地面任务界面","地上ミッション画面"],
["MISSIONE · LIBERA LA COLONIA","MISSION · FREE THE COLONY","MISSION · LIBÈRE LA COLONIE","MISIÓN · LIBERA LA COLONIA","МИССИЯ · ОСВОБОДИ КОЛОНИЮ","任务 · 解放殖民地","ミッション · コロニーを解放"],
["AVANZAMENTO VERSO IL ROBOT","PROGRESS TOWARD THE ROBOT","PROGRESSION VERS LE ROBOT","AVANCE HACIA EL ROBOT","ПРОДВИЖЕНИЕ К РОБОТУ","向机器人推进","ロボットへの進行"],
["LIBERA I COLONI","FREE THE COLONISTS","LIBÈRE LES COLONS","LIBERA A LOS COLONOS","ОСВОБОДИ КОЛОНИСТОВ","解救殖民者","入植者を解放"],
["ROBOT DA GUERRA RIBELLE","REBEL WAR ROBOT","ROBOT DE GUERRE REBELLE","ROBOT DE GUERRA REBELDE","БОЕВОЙ РОБОТ МЯТЕЖНИКОВ","叛军战争机器人","反乱軍の戦闘ロボット"],
["SALUTE","HEALTH","SANTÉ","SALUD","ЗДОРОВЬЕ","生命","体力"],
["VITE","LIVES","VIES","VIDAS","ЖИЗНИ","生命","残機"],
["GRANATE","GRENADES","GRENADES","GRANADAS","ГРАНАТЫ","手雷","手榴弾"],
["SCUDO · MOUSE DX","SHIELD · RIGHT MOUSE","BOUCLIER · CLIC DROIT","ESCUDO · BOTÓN DERECHO","ЩИТ · ПРАВАЯ КНОПКА","护盾 · 鼠标右键","シールド · 右クリック"],
["A / D muovi · W / SPAZIO salta · S abbassati (S + SPAZIO scendi dalla piattaforma) · MOUSE mira · CLIC spara · ROTELLA o E granata · MOUSE DX scudo · P pausa","A / D move · W / SPACE jump · S crouch (S + SPACE drop through platform) · MOUSE aim · CLICK fire · WHEEL or E grenade · RIGHT MOUSE shield · P pause","A / D bouger · W / ESPACE sauter · S s’accroupir (S + ESPACE descendre de la plateforme) · SOURIS viser · CLIC tirer · MOLETTE ou E grenade · CLIC DROIT bouclier · P pause","A / D mover · W / ESPACIO saltar · S agacharse (S + ESPACIO bajar de la plataforma) · RATÓN apuntar · CLIC disparar · RUEDA o E granada · BOTÓN DERECHO escudo · P pausa","A / D движение · W / ПРОБЕЛ прыжок · S пригнуться (S + ПРОБЕЛ спрыгнуть с платформы) · МЫШЬ прицел · КЛИК огонь · КОЛЁСИКО или E граната · ПРАВАЯ КНОПКА щит · P пауза","A / D 移动 · W / 空格 跳跃 · S 蹲下（S + 空格 跳下平台）· 鼠标 瞄准 · 点击 射击 · 滚轮 或 E 手雷 · 鼠标右键 护盾 · P 暂停","A / D 移動 · W / スペース ジャンプ · S しゃがむ（S + スペースで足場から降りる）· マウス 照準 · クリック 射撃 · ホイール または E 手榴弾 · 右クリック シールド · P ポーズ"],
["Crediti","Credits","Crédits","Créditos","Кредиты","积分","クレジット"],
["Mercato","Market","Marché","Mercado","Рынок","商店","マーケット"],
["CANTIERE DELLA REPUBBLICA","REPUBLIC SHIPYARD","CHANTIER DE LA RÉPUBLIQUE","ASTILLERO DE LA REPÚBLICA","ВЕРФЬ РЕСПУБЛИКИ","共和国船坞","共和国造船所"],
["Chiudi mercato","Close market","Fermer le marché","Cerrar mercado","Закрыть рынок","关闭商店","マーケットを閉じる"],
["SALDO DISPONIBILE","AVAILABLE BALANCE","SOLDE DISPONIBLE","SALDO DISPONIBLE","ДОСТУПНЫЙ БАЛАНС","可用余额","利用可能残高"],
["COSTI IN MISSIONE · colpo 1 CR · missile 25 CR · granata 20 CR · carburante 2 CR/unità. Taglia: 10 CR per nemico nello spazio, 15 CR per ribelle a terra.","MISSION COSTS · shot 1 CR · missile 25 CR · grenade 20 CR · fuel 2 CR/unit. Bounty: per enemy in space and per rebel on the ground.","COÛTS EN MISSION · tir 1 CR · missile 25 CR · grenade 20 CR · carburant 2 CR/unité. Prime : par ennemi dans l’espace et par rebelle au sol.","COSTES EN MISIÓN · disparo 1 CR · misil 25 CR · granada 20 CR · combustible 2 CR/unidad. Recompensa: por enemigo en el espacio y por rebelde en tierra.","РАСХОДЫ В МИССИИ · выстрел 1 CR · ракета 25 CR · граната 20 CR · топливо 2 CR/ед. Награда: за врага в космосе и за мятежника на земле.","任务费用 · 射击 1 CR · 导弹 25 CR · 手雷 20 CR · 燃料 2 CR/单位。赏金：太空击败敌人和地面击败叛军均可获得。","ミッション費用 · 射撃 1 CR · ミサイル 25 CR · 手榴弾 20 CR · 燃料 2 CR/単位。報奨金：宇宙の敵と地上の反乱兵ごとに支給。"],
["CHIUDI IL MERCATO","CLOSE THE MARKET","FERMER LE MARCHÉ","CERRAR EL MERCADO","ЗАКРЫТЬ РЫНОК","关闭商店","マーケットを閉じる"],
["ROTTA BLOCCATA","COURSE LOCKED","ROUTE VERROUILLÉE","RUMBO FIJADO","КУРС ЗАДАН","航线锁定","航路固定"],
[" più un bonus per ogni ostaggio liberato."," plus a bonus for each hostage freed."," plus un bonus pour chaque otage libéré."," más un bonus por cada rehén liberado."," плюс бонус за каждого освобождённого заложника."," 另加每名获救人质的奖励。"," に加え、解放した人質ごとにボーナス。"],
[" è distrutto e la colonia di "," is destroyed and the colony of "," est détruit et la colonie de "," ha sido destruido y la colonia de "," уничтожен, и колония "," 已被摧毁，殖民地 "," は破壊され、コロニー "],
["un granchio meccanico corazzato con chele-cannone","an armored mechanical crab with cannon claws","un crabe mécanique blindé aux pinces-canons","un cangrejo mecánico blindado con pinzas-cañón","бронированный механический краб с клешнями-пушками","一只钳子是大炮的装甲机械蟹","砲のハサミを持つ装甲メカガニ"],
["uno scorpione d’acciaio con un pungiglione laser","a steel scorpion with a laser stinger","un scorpion d’acier au dard laser","un escorpión de acero con un aguijón láser","стальной скорпион с лазерным жалом","一只带激光毒刺的钢铁蝎子","レーザーの毒針を持つ鋼鉄のサソリ"],
["una sentinella volante carica di fulmini","a flying sentinel charged with lightning","une sentinelle volante chargée d’éclairs","un centinela volador cargado de rayos","летающий страж, заряженный молниями","一个充满闪电的飞行哨兵","雷をまとった飛行番兵"],
["un colosso meccanico coperto di muschio","a mechanical colossus covered in moss","un colosse mécanique couvert de mousse","un coloso mecánico cubierto de musgo","механический колосс, поросший мхом","一个长满苔藓的机械巨像","苔に覆われた機械の巨像"],
["il robot da guerra che tiene in ostaggio la colonia","the war robot holding the colony hostage","le robot de guerre qui tient la colonie en otage","el robot de guerra que tiene la colonia como rehén","боевой робот, держащий колонию в заложниках","挟持殖民地的战争机器人","コロニーを人質に取る戦闘ロボット"],
["I motori consumano meno carburante.","The engines burn less fuel.","Les moteurs consomment moins de carburant.","Los motores gastan menos combustible.","Двигатели расходуют меньше топлива.","引擎消耗更少燃料。","エンジンの燃料消費が減る。"],
["CARTOGRAFIA ORBITALE  /  05 MONDI","ORBITAL CHART  /  05 WORLDS","CARTOGRAPHIE ORBITALE  /  05 MONDES","CARTOGRAFÍA ORBITAL  /  05 MUNDOS","ОРБИТАЛЬНАЯ КАРТА  /  05 МИРОВ","轨道星图  /  05 个世界","軌道図  /  05 世界"],
["SELEZIONA UN MONDO / TRACCIA LA TUA ROTTA","SELECT A WORLD / PLOT YOUR COURSE","CHOISIS UN MONDE / TRACE TA ROUTE","ELIGE UN MUNDO / TRAZA TU RUMBO","ВЫБЕРИ МИР / ПРОЛОЖИ КУРС","选择世界 / 规划航线","世界を選び / 航路を描け"],
["Musica spaziale originale · si avvia al primo clic.","Original space music · starts on the first click.","Musique spatiale originale · démarre au premier clic.","Música espacial original · empieza con el primer clic.","Оригинальная космическая музыка · начинается с первого клика.","原创太空音乐 · 首次点击后播放。","オリジナル宇宙音楽 · 最初のクリックで開始。"],
["LINGUA","LANGUAGE","LANGUE","IDIOMA","ЯЗЫК","语言","言語"],
["Lingua dei menu e dei messaggi di gioco.","Language for menus and in-game messages.","Langue des menus et des messages du jeu.","Idioma de los menús y mensajes del juego.","Язык меню и игровых сообщений.","菜单和游戏提示的语言。","メニューとゲーム内メッセージの言語。"],
["CLASSIFICA","LEADERBOARD","CLASSEMENT","CLASIFICACIÓN","РЕЙТИНГ","排行榜","ランキング"],
["Apri la classifica","Open the leaderboard","Ouvrir le classement","Abrir la clasificación","Открыть рейтинг","打开排行榜","ランキングを開く"],
["PUNTI","SCORE","POINTS","PUNTOS","ОЧКИ","分数","スコア"],
["PUNTEGGIO FINALE","FINAL SCORE","SCORE FINAL","PUNTUACIÓN FINAL","ИТОГОВЫЙ СЧЁТ","最终得分","最終スコア"],
["INSERISCI IL TUO NOME","ENTER YOUR NAME","ENTRE TON NOM","ESCRIBE TU NOMBRE","ВВЕДИ СВОЁ ИМЯ","输入你的名字","名前を入力"],
["Massimo 20 lettere","Up to 20 letters","20 lettres maximum","Máximo 20 letras","Не больше 20 букв","最多 20 个字","最大 20 文字"],
["SALVA IN CLASSIFICA","SAVE TO LEADERBOARD","ENREGISTRER AU CLASSEMENT","GUARDAR EN LA CLASIFICACIÓN","СОХРАНИТЬ В РЕЙТИНГ","保存到排行榜","ランキングに登録"],
["I PRIMI 10.000 PILOTI","TOP 10,000 PILOTS","LES 10 000 MEILLEURS PILOTES","LOS 10.000 MEJORES PILOTOS","ЛУЧШИЕ 10 000 ПИЛОТОВ","前 10,000 名飞行员","トップ 10,000 パイロット"],
["FUORI DAI PRIMI 10.000","OUTSIDE THE TOP 10,000","HORS DU TOP 10 000","FUERA DE LOS 10.000 PRIMEROS","ВНЕ ТОП-10 000","未进入前 10,000","トップ 10,000 圏外"],
["ALTRI 100","100 MORE","100 DE PLUS","100 MÁS","ЕЩЁ 100","再加载 100 名","さらに 100"],
["I PRIMI 100 PILOTI","TOP 100 PILOTS","LES 100 MEILLEURS PILOTES","LOS 100 MEJORES PILOTOS","ЛУЧШИЕ 100 ПИЛОТОВ","前 100 名飞行员","トップ 100 パイロット"],
["Nessun punteggio ancora: completa una partita per entrare in classifica.","No scores yet: finish a game to enter the leaderboard.","Aucun score pour l’instant : termine une partie pour entrer au classement.","Aún no hay puntuaciones: termina una partida para entrar en la clasificación.","Пока нет результатов: закончи игру, чтобы попасть в рейтинг.","暂无分数：完成一局游戏即可上榜。","まだスコアがありません。ゲームを終えるとランキングに載ります。"],
["POS.","RANK","RANG","POS.","МЕСТО","名次","順位"],
["NOME","NAME","NOM","NOMBRE","ИМЯ","名字","名前"],
["DATA","DATE","DATE","FECHA","ДАТА","日期","日付"],
["CHIUDI","CLOSE","FERMER","CERRAR","ЗАКРЫТЬ","关闭","閉じる"],
["Chiudi classifica","Close leaderboard","Fermer le classement","Cerrar clasificación","Закрыть рейтинг","关闭排行榜","ランキングを閉じる"],
["PUNTEGGIO SALVATO · POSIZIONE ","SCORE SAVED · RANK ","SCORE ENREGISTRÉ · RANG ","PUNTUACIÓN GUARDADA · PUESTO ","СЧЁТ СОХРАНЁН · МЕСТО ","分数已保存 · 名次 ","スコア登録 · 順位 "],
["FUORI DAI PRIMI 100","OUTSIDE THE TOP 100","HORS DU TOP 100","FUERA DE LOS 100 PRIMEROS","ВНЕ ТОП-100","未进入前 100","トップ 100 圏外"],
["Scrivi un nome","Type a name","Écris un nom","Escribe un nombre","Введи имя","请输入名字","名前を入力してね"],
["PARTITA FINITA","GAME FINISHED","PARTIE TERMINÉE","PARTIDA TERMINADA","ИГРА ОКОНЧЕНА","游戏结束","ゲーム終了"],
["Punti: nemici abbattuti, coloni salvati, orbite conquistate e colonie liberate. Più alta la minaccia, più punti.","Points: enemies downed, colonists rescued, orbits conquered and colonies freed. The higher the threat, the more points.","Points : ennemis abattus, colons sauvés, orbites conquises et colonies libérées. Plus la menace est grande, plus il y a de points.","Puntos: enemigos abatidos, colonos rescatados, órbitas conquistadas y colonias liberadas. Cuanto mayor la amenaza, más puntos.","Очки: сбитые враги, спасённые колонисты, захваченные орбиты и освобождённые колонии. Чем выше угроза, тем больше очков.","得分来源：击落敌人、解救殖民者、占领轨道和解放殖民地。威胁越高，得分越多。","スコア：敵の撃破、入植者の救出、軌道の制圧、コロニーの解放。脅威が高いほど高得点。"],
["La classifica mondiale è condivisa da tutti i giocatori.","The world leaderboard is shared by all players.","Le classement mondial est partagé par tous les joueurs.","La clasificación mundial la comparten todos los jugadores.","Мировой рейтинг общий для всех игроков.","世界排行榜由所有玩家共享。","世界ランキングは全プレイヤー共通です。"],
["OFFLINE · SALVATO IN QUESTO BROWSER, VERRÀ INVIATO PIÙ TARDI","OFFLINE · SAVED IN THIS BROWSER, IT WILL BE SENT LATER","HORS LIGNE · ENREGISTRÉ DANS CE NAVIGATEUR, IL SERA ENVOYÉ PLUS TARD","SIN CONEXIÓN · GUARDADO EN ESTE NAVEGADOR, SE ENVIARÁ MÁS TARDE","НЕТ СЕТИ · СОХРАНЕНО В ЭТОМ БРАУЗЕРЕ, ОТПРАВИМ ПОЗЖЕ","离线 · 已保存在此浏览器，稍后发送","オフライン · このブラウザに保存、あとで送信します"],
["OFFLINE · CLASSIFICA DI QUESTO BROWSER","OFFLINE · THIS BROWSER'S LEADERBOARD","HORS LIGNE · CLASSEMENT DE CE NAVIGATEUR","SIN CONEXIÓN · CLASIFICACIÓN DE ESTE NAVEGADOR","НЕТ СЕТИ · РЕЙТИНГ ЭТОГО БРАУЗЕРА","离线 · 此浏览器的排行榜","オフライン · このブラウザのランキング"],
["INVIO ALLA CLASSIFICA MONDIALE…","SENDING TO THE WORLD LEADERBOARD…","ENVOI AU CLASSEMENT MONDIAL…","ENVIANDO A LA CLASIFICACIÓN MUNDIAL…","ОТПРАВКА В МИРОВОЙ РЕЙТИНГ…","正在提交到世界排行榜…","世界ランキングに送信中…"],
["CLASSIFICA MONDIALE · POSIZIONE ","WORLD LEADERBOARD · RANK ","CLASSEMENT MONDIAL · RANG ","CLASIFICACIÓN MUNDIAL · PUESTO ","МИРОВОЙ РЕЙТИНГ · МЕСТО ","世界排行榜 · 名次 ","世界ランキング · 順位 "],
["QUESTO BROWSER","THIS BROWSER","CE NAVIGATEUR","ESTE NAVEGADOR","ЭТОТ БРАУЗЕР","此浏览器","このブラウザ"],
["CARICAMENTO…","LOADING…","CHARGEMENT…","CARGANDO…","ЗАГРУЗКА…","加载中…","読み込み中…"],
["MONDO","WORLD","MONDE","MUNDO","МИР","世界","ワールド"],
["La classifica è salvata in questo browser.","The leaderboard is saved in this browser.","Le classement est enregistré dans ce navigateur.","La clasificación se guarda en este navegador.","Рейтинг хранится в этом браузере.","排行榜保存在此浏览器中。","ランキングはこのブラウザに保存されます。"],
["PIANETA LIBERATO","PLANET FREED","PLANÈTE LIBÉRÉE","PLANETA LIBERADO","ПЛАНЕТА СВОБОДНА","星球已解放","惑星解放済み"],
["LIBERA TUTTI I PIANETI","FREE ALL PLANETS FIRST","LIBÈRE TOUTES LES PLANÈTES","LIBERA TODOS LOS PLANETAS","ОСВОБОДИ ВСЕ ПЛАНЕТЫ","先解放所有星球","全惑星を解放せよ"],
["NUOVA PARTITA","NEW GAME","NOUVELLE PARTIE","NUEVA PARTIDA","НОВАЯ ИГРА","新游戏","ニューゲーム"],
["BLOCCATO","LOCKED","VERROUILLÉ","BLOQUEADO","ЗАКРЫТО","已锁定","ロック中"],
["Colonia liberata: questa missione è conclusa e non si può ripetere.","Colony freed: this mission is complete and cannot be replayed.","Colonie libérée : cette mission est terminée et ne peut pas être rejouée.","Colonia liberada: esta misión está completada y no se puede repetir.","Колония освобождена: миссия завершена, повторить её нельзя.","殖民地已解放：此任务已完成，无法重玩。","植民地は解放された：この任務は完了しており、再挑戦できない。"],
["Avvistato in lontananza. Libera tutti e cinque i pianeti per aprire la rotta verso OMEGA.","Sighted far in the distance. Free all five planets to open the route to OMEGA.","Aperçue au loin. Libère les cinq planètes pour ouvrir la route vers OMEGA.","Avistado a lo lejos. Libera los cinco planetas para abrir la ruta hacia OMEGA.","Виден вдали. Освободи все пять планет, чтобы открыть путь к OMEGA.","远方隐约可见。解放全部五颗星球，开辟通往 OMEGA 的航线。","はるか遠くに見える。5つの惑星をすべて解放して OMEGA への航路を開け。"],
["SGANCIO DEL PILOTA · DISCESA COL JETPACK","PILOT DEPLOYED · JETPACK DESCENT","PILOTE LARGUÉ · DESCENTE EN JETPACK","PILOTO LANZADO · DESCENSO CON JETPACK","ПИЛОТ ВЫСАЖЕН · СПУСК НА ДЖЕТПАКЕ","驾驶员空降 · 喷气背包下降","パイロット降下 · ジェットパックで降下"],
["NEMICO AL RIPARO · COLPISCILO QUANDO SI ALZA O USA UNA GRANATA","ENEMY IN COVER · SHOOT WHEN HE POPS UP OR USE A GRENADE","ENNEMI À COUVERT · TIRE QUAND IL SE LÈVE OU LANCE UNE GRENADE","ENEMIGO A CUBIERTO · DISPARA CUANDO SE ASOME O USA UNA GRANADA","ВРАГ В УКРЫТИИ · СТРЕЛЯЙ, КОГДА ОН ВСТАЁТ, ИЛИ БРОСЬ ГРАНАТУ","敌人躲在掩体后 · 趁他起身时射击或扔手雷","敵が遮蔽物に隠れている · 顔を出した瞬間を撃つかグレネードを使え"],
["PARETE ROCCIOSA · USA IL JETPACK PER SALIRE","ROCK WALL · USE THE JETPACK TO CLIMB","PAROI ROCHEUSE · UTILISE LE JETPACK POUR MONTER","PARED DE ROCA · USA EL JETPACK PARA SUBIR","СКАЛА · ПОДНИМИСЬ НА ДЖЕТПАКЕ","岩壁 · 用喷气背包向上飞","岩壁 · ジェットパックで登れ"],
["BURRONE · PLANA COL JETPACK (SALTO + GIÙ)","CHASM · GLIDE WITH THE JETPACK (JUMP + DOWN)","RAVIN · PLANE AVEC LE JETPACK (SAUT + BAS)","BARRANCO · PLANEA CON EL JETPACK (SALTO + ABAJO)","ПРОПАСТЬ · ПЛАНИРУЙ НА ДЖЕТПАКЕ (ПРЫЖОК + ВНИЗ)","深谷 · 用喷气背包滑翔（跳跃 + 下）","谷 · ジェットパックで滑空（ジャンプ + 下）"],
["NUCLEO IN SOVRACCARICO · ALLONTANATI","CORE OVERLOAD · GET CLEAR","NOYAU EN SURCHARGE · ÉLOIGNE-TOI","NÚCLEO SOBRECARGADO · ALÉJATE","ПЕРЕГРУЗКА ЯДРА · ОТХОДИ","核心过载 · 快撤离","コア過負荷 · 離れろ"],
["← TORNA AL MENU","← BACK TO MENU","← RETOUR AU MENU","← VOLVER AL MENÚ","← НАЗАД В МЕНЮ","← 返回菜单","← メニューに戻る"]
];

// Lingua predefinita: inglese. La chiave è nuova (stellarLang): le vecchie scelte salvate (stellarLingua) non contano più, così tutti ripartono in inglese.
function i18nLoad(){try{const l=localStorage.getItem('stellarLang');return l&&I18N_COL[l]!==undefined?l:'en'}catch(e){return 'en'}}
let lang=i18nLoad(),i18nMap=null,i18nRe=null,i18nCache=new Map();
function i18nEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function i18nBuild(){
 i18nCache=new Map();
 if(lang==='it'){i18nMap=null;i18nRe=null;return}
 const col=I18N_COL[lang];i18nMap=new Map(I18N_ROWS.map(r=>[r[0],r[col]]));
 // Frasi più lunghe prima; parole intere: "MARE" non tocca "MAREA".
 const keys=[...i18nMap.keys()].sort((a,b)=>b.length-a.length);
 i18nRe=new RegExp(keys.map(k=>(/^\p{L}/u.test(k)?'(?<!\\p{L})':'')+i18nEsc(k)+(/\p{L}$/u.test(k)?'(?!\\p{L})':'')).join('|'),'gu');
}
// Traduce una stringa italiana nella lingua scelta.
// Su cellulare spariscono dai testi le indicazioni di tastiera e mouse.
const I18N_TOUCH=[[/ · FRENO: F/g,''],[/ · CLIC ROTELLA(: TIRO DIRITTO)?/g,''],[/% · CLIC ROTELLA: TIRO DIRITTO/g,'%'],[/RALLENTA CON F PER CONQUISTARE/g,'FRENA PER CONQUISTARE'],[/ · MANOVRA CON F \/ S \/ A \/ D/g,''],[/ · (SHIFT DX|MOUSE DX)/g,'']];
function i18nTouch(){return typeof touch!=='undefined'&&touch&&touch.on}
function tr(s){
 if(typeof s!=='string'||!s)return s;
 const t=i18nTouch();if(!i18nRe&&!t)return s;
 let o=i18nCache.get(s);if(o!==undefined)return o;
 o=s;if(t)for(const [re,rep] of I18N_TOUCH)o=o.replace(re,rep);
 if(i18nRe)o=o.replace(i18nRe,m=>i18nMap.get(m));
 if(i18nCache.size>4000)i18nCache.clear();i18nCache.set(s,o);return o;
}
i18nBuild();

// ---- testi del canvas
if(typeof CanvasRenderingContext2D!=='undefined'){
 const P=CanvasRenderingContext2D.prototype,ft=P.fillText,st=P.strokeText,mt=P.measureText;
 P.fillText=function(t,...a){return ft.call(this,tr(String(t)),...a)};
 P.strokeText=function(t,...a){return st.call(this,tr(String(t)),...a)};
 P.measureText=function(t){return mt.call(this,tr(String(t)))};
}

// ---- testi della pagina: si ricorda l'originale italiano di ogni nodo
const i18nSrc=new WeakMap(),i18nOut=new WeakMap(),i18nAttr=new WeakMap(),I18N_ATTRS=['aria-label','title','placeholder'];
function i18nText(n){
 const p=n.parentNode;if(p&&(p.nodeName==='SCRIPT'||p.nodeName==='STYLE'||p.nodeName==='OPTION'))return;
 if(i18nOut.get(n)!==n.data)i18nSrc.set(n,n.data);
 const out=tr(i18nSrc.get(n));if(out!==n.data)n.data=out;i18nOut.set(n,out);
}
function i18nEl(el){
 let rec=i18nAttr.get(el);
 for(const a of I18N_ATTRS){
  if(!el.hasAttribute(a))continue;
  if(!rec){rec={};i18nAttr.set(el,rec)}
  const cur=el.getAttribute(a);
  if(!rec[a]||rec[a].out!==cur)rec[a]={src:cur};
  const out=tr(rec[a].src);rec[a].out=out;if(out!==cur)el.setAttribute(a,out);
 }
}
function i18nWalk(root){
 if(!root)return;
 if(root.nodeType===3){i18nText(root);return}
 if(root.nodeType!==1)return;
 i18nEl(root);
 const w=document.createTreeWalker(root,5);let n;
 while((n=w.nextNode())){if(n.nodeType===3)i18nText(n);else i18nEl(n)}
}
let i18nObs=null;
function i18nApply(){
 if(typeof document==='undefined'||!document.body||!document.createTreeWalker)return;
 document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
 i18nWalk(document.body);
 // Testi scritti nel CSS
 let st=$('i18nCss');
 if(!st&&document.createElement){st=document.createElement('style');st.id='i18nCss';document.head.appendChild(st)}
 if(st)st.textContent=`.star-map:after{content:${JSON.stringify(tr('CARTOGRAFIA ORBITALE  /  05 MONDI'))}}body #mapScreen .star-map:after{content:${JSON.stringify(tr('SELEZIONA UN MONDO / TRACCIA LA TUA ROTTA'))}}`;
 if(lang==='ru'&&!$('i18nFont')&&document.createElement){const l=document.createElement('link');l.id='i18nFont';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap';document.head.appendChild(l)}
 if(st&&lang==='ru')st.textContent+="html[lang=ru] body,html[lang=ru] body *{font-family:'Exo 2','Chakra Petch',sans-serif!important}";
 for(const s of document.querySelectorAll('.lang-select'))s.value=lang;
 if(!i18nObs&&typeof MutationObserver!=='undefined'){
  i18nObs=new MutationObserver(list=>{for(const m of list){
   if(m.type==='characterData')i18nText(m.target);
   else if(m.type==='attributes')i18nEl(m.target);
   else for(const n of m.addedNodes)i18nWalk(n);
  }});
  i18nObs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:I18N_ATTRS});
 }
}
function setLang(l){
 if(I18N_COL[l]===undefined)return;
 lang=l;try{localStorage.setItem('stellarLang',l)}catch(e){}
 i18nBuild();i18nApply();
}

// ---- selettori della lingua: in alto nella mappa e nelle impostazioni
function i18nSelect(){
 const s=document.createElement('select');s.className='lang-select';s.setAttribute('aria-label','LINGUA');
 for(const [code,name] of I18N_LANGS){const o=document.createElement('option');o.value=code;o.textContent=name;s.appendChild(o)}
 s.value=lang;s.onchange=()=>setLang(s.value);
 s.addEventListener('keydown',e=>e.stopPropagation());
 return s;
}
if(typeof document!=='undefined'&&document.createElement&&$('settingsBtn')&&$('settingsBtn').parentNode&&$('settingsBtn').parentNode.insertBefore){
 const top=i18nSelect();top.classList.add('lang-top');$('settingsBtn').parentNode.insertBefore(top,$('settingsBtn'));
 const card=document.querySelector('.settings-card'),close=$('closeSettings');
 if(card&&close){
  const b=document.createElement('div');b.className='setting-block sound-row';
  b.innerHTML='<div><div class="setting-title"><span>LINGUA</span></div><p>Lingua dei menu e dei messaggi di gioco.</p></div>';
  b.appendChild(i18nSelect());card.insertBefore(b,close);
 }
}
i18nApply();
