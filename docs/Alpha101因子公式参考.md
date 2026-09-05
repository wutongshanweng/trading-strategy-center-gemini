```
Alpha1:   (-1 * CORR(RANK(DELTA(LOG(VOLUME), 1)), RANK(((CLOSE -OPEN) / OPEN)), 6))

Alpha2:   (-1 * DELTA((((CLOSE -LOW) -(HIGH -CLOSE)) / (HIGH -LOW)), 1))

Alpha3:   SUM((CLOSE=DELAY(CLOSE,1)?0:CLOSE-(CLOSE>DELAY(CLOSE,1)?MIN(LOW,DELAY(CLOSE,1)):MAX(HIGH,DELAY(CLOSE,1)))),6)

Alpha4:   ((((SUM(CLOSE, 8) / 8) + STD(CLOSE, 8)) < (SUM(CLOSE, 2) / 2)) ? (-1 * 1) : (((SUM(CLOSE, 2) / 2) <((SUM(CLOSE, 8) / 8) -STD(CLOSE, 8))) ? 1 : (((1 < (VOLUME / MEAN(VOLUME,20))) || ((VOLUME /MEAN(VOLUME,20)) == 1)) ? 1 : (-1 * 1))))

Alpha5:   (-1 * TSMAX(CORR(TSRANK(VOLUME, 5), TSRANK(HIGH, 5), 5), 3))

Alpha6:   (RANK(SIGN(DELTA((((OPEN * 0.85) + (HIGH * 0.15))), 4)))* -1)

Alpha7:   ((RANK(MAX((VWAP -CLOSE), 3)) + RANK(MIN((VWAP -CLOSE), 3))) * RANK(DELTA(VOLUME, 3)))

Alpha8:   RANK(DELTA(((((HIGH + LOW) / 2) * 0.2) + (VWAP * 0.8)), 4) * -1)

Alpha9:   SMA(((HIGH+LOW)/2-(DELAY(HIGH,1)+DELAY(LOW,1))/2)*(HIGH-LOW)/VOLUME,7,2)

Alpha10:  (RANK(MAX(((RET < 0) ? STD(RET, 20) : CLOSE)^2),5))

Alpha11:  SUM(((CLOSE-LOW)-(HIGH-CLOSE))./(HIGH-LOW).*VOLUME,6)

Alpha12:  (RANK((OPEN -(SUM(VWAP, 10) / 10)))) * (-1 * (RANK(ABS((CLOSE -VWAP)))))

Alpha13:  (((HIGH * LOW)^0.5) -VWAP)

Alpha14:  CLOSE-DELAY(CLOSE,5)

Alpha15:  OPEN/DELAY(CLOSE,1)-1

Alpha16:  (-1 * TSMAX(RANK(CORR(RANK(VOLUME), RANK(VWAP), 5)), 5))

Alpha17:  RANK((VWAP -MAX(VWAP, 15)))^DELTA(CLOSE, 5)

Alpha18:  CLOSE/DELAY(CLOSE,5)

Alpha19:  (CLOSE<DELAY(CLOSE,5)?(CLOSE-DELAY(CLOSE,5))/DELAY(CLOSE,5):(CLOSE=DELAY(CLOSE,5)?0:(CLOSE-DELAY(CLOSE,5))/CLOSE))

Alpha20:  (CLOSE-DELAY(CLOSE,6))/DELAY(CLOSE,6)*100

Alpha21:  REGBETA(MEAN(CLOSE,6),SEQUENCE(6))

Alpha22:  SMEAN(((CLOSE-MEAN(CLOSE,6))/MEAN(CLOSE,6)-DELAY((CLOSE-MEAN(CLOSE,6))/MEAN(CLOSE,6),3)),12,1)

Alpha23:  SMA((CLOSE>DELAY(CLOSE,1)?STD(CLOSE:20),0),20,1)/(SMA((CLOSE>DELAY(CLOSE,1)?STD(CLOSE,20):0),20,1)+SMA((CLOSE<=DELAY(CLOSE,1)?STD(CLOSE,20):0),20,1))*100

Alpha24:  SMA(CLOSE-DELAY(CLOSE,5),5,1)

Alpha25:  ((-1 * RANK((DELTA(CLOSE, 7) * (1 -RANK(DECAYLINEAR((VOLUME/MEAN(VOLUME,20)), 9)))))) * (1 +RANK(SUM(RET, 250))))

Alpha26:  ((((SUM(CLOSE, 7) / 7) -CLOSE)) + ((CORR(VWAP, DELAY(CLOSE, 5), 230))))

Alpha27:  WMA((CLOSE-DELAY(CLOSE,3))/DELAY(CLOSE,3)*100+(CLOSE-DELAY(CLOSE,6))/DELAY(CLOSE,6)*100,12)

Alpha28:  3*SMA((CLOSE-TSMIN(LOW,9))/(TSMAX(HIGH,9)-TSMIN(LOW,9))*100,3,1)-2*SMA(SMA((CLOSE-TSMIN(LOW,9))/(MAX(HIGH,9)-TSMAX(LOW,9))*100,3,1),3,1)

Alpha29:  (CLOSE-DELAY(CLOSE,6))/DELAY(CLOSE,6)*VOLUME

Alpha30:  WMA((REGRESI(CLOSE/DELAY(CLOSE)-1,MKT,SMB,HML，60))^2,20)

Alpha31:  (CLOSE-MEAN(CLOSE,12))/MEAN(CLOSE,12)*100

Alpha32:  (-1 * SUM(RANK(CORR(RANK(HIGH), RANK(VOLUME), 3)), 3))

Alpha33:  ((((-1 * TSMIN(LOW, 5)) + DELAY(TSMIN(LOW, 5), 5)) * RANK(((SUM(RET, 240) -SUM(RET, 20)) / 220))) *TSRANK(VOLUME, 5))

Alpha34:  MEAN(CLOSE,12)/CLOSE

Alpha35:  (MIN(RANK(DECAYLINEAR(DELTA(OPEN, 1), 15)), RANK(DECAYLINEAR(CORR((VOLUME), ((OPEN * 0.65) +(OPEN *0.35)), 17),7))) * -1)

Alpha36:  RANK(SUM(CORR(RANK(VOLUME), RANK(VWAP)), 6), 2)

Alpha37:  (-1 * RANK(((SUM(OPEN, 5) * SUM(RET, 5)) -DELAY((SUM(OPEN,5) * SUM(RET, 5)), 10))))

Alpha38:  (((SUM(HIGH, 20) / 20) < HIGH) ? (-1 * DELTA(HIGH, 2)) : 0)

Alpha39:  ((RANK(DECAYLINEAR(DELTA((CLOSE), 2),8)) -RANK(DECAYLINEAR(CORR(((VWAP * 0.3) + (OPEN * 0.7)),SUM(MEAN(VOLUME,180), 37), 14), 12))) * -1)

Alpha40:  SUM((CLOSE>DELAY(CLOSE,1)?VOLUME:0),26)/SUM((CLOSE<=DELAY(CLOSE,1)?VOLUME:0),26)*100

Alpha41:  (RANK(MAX(DELTA((VWAP), 3), 5))* -1)

Alpha42:  ((-1 * RANK(STD(HIGH, 10))) * CORR(HIGH, VOLUME, 10))

Alpha43:  SUM((CLOSE>DELAY(CLOSE,1)?VOLUME:(CLOSE<DELAY(CLOSE,1)?-VOLUME:0)),6)

Alpha44:  (TSRANK(DECAYLINEAR(CORR(((LOW )), MEAN(VOLUME,10), 7), 6),4) + TSRANK(DECAYLINEAR(DELTA((VWAP),3), 10), 15))

Alpha45:  (RANK(DELTA((((CLOSE * 0.6) + (OPEN *0.4))), 1)) * RANK(CORR(VWAP, MEAN(VOLUME,150), 15)))

Alpha46:  (MEAN(CLOSE,3)+MEAN(CLOSE,6)+MEAN(CLOSE,12)+MEAN(CLOSE,24))/(4*CLOSE)

Alpha47:  SMA((TSMAX(HIGH,6)-CLOSE)/(TSMAX(HIGH,6)-TSMIN(LOW,6))*100,9,1)

Alpha48:  (-1*((RANK(((SIGN((CLOSE -DELAY(CLOSE, 1))) + SIGN((DELAY(CLOSE, 1) -DELAY(CLOSE, 2)))) +SIGN((DELAY(CLOSE, 2) -DELAY(CLOSE, 3)))))) * SUM(VOLUME, 5)) / SUM(VOLUME, 20))

Alpha49:  SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)/(SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)+SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12))

Alpha50:  SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)/(SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)+SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12))-SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)/(SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)+SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12))

Alpha51:  SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)/(SUM(((HIGH+LOW)<=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12)+SUM(((HIGH+LOW)>=(DELAY(HIGH,1)+DELAY(LOW,1))?0:MAX(ABS(HIGH-DELAY(HIGH,1)),ABS(LOW-DELAY(LOW,1)))),12))

Alpha52:  SUM(MAX(0,HIGH-DELAY((HIGH+LOW+CLOSE)/3,1)),26)/SUM(MAX(0,DELAY((HIGH+LOW+CLOSE)/3,1)-L),26)*100

Alpha53:  COUNT(CLOSE>DELAY(CLOSE,1),12)/12*100

Alpha54:  (-1 * RANK((STD(ABS(CLOSE -OPEN)) + (CLOSE -OPEN)) + CORR(CLOSE, OPEN,10)))

Alpha55:  SUM(16*(CLOSE-DELAY(CLOSE,1)+(CLOSE-OPEN)/2+DELAY(CLOSE,1)-DELAY(OPEN,1))/((ABS(HIGH-DELAY(CLOSE,1))>ABS(LOW-DELAY(CLOSE,1))&ABS(HIGH-DELAY(CLOSE,1))>ABS(HIGH-DELAY(LOW,1))?ABS(HIGH-DELAY(CLOSE,1))+ABS(LOW-DELAY(CLOSE,1))/2+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4:(ABS(LOW-DELAY(CLOSE,1))>ABS(HIGH-DELAY(LOW,1))&ABS(LOW-DELAY(CLOSE,1))>ABS(HIGH-DELAY(CLOSE,1))?ABS(LOW-DELAY(CLOSE,1))+ABS(HIGH-DELAY(CLOSE,1))/2+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4:ABS(HIGH-DELAY(LOW,1))+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4)))*MAX(ABS(HIGH-DELAY(CLOSE,1)),ABS(LOW-DELAY(CLOSE,1))),20)

Alpha56:  (RANK((OPEN -TSMIN(OPEN, 12))) < RANK((RANK(CORR(SUM(((HIGH + LOW) / 2), 19), SUM(MEAN(VOLUME,40), 19), 13))^5)))

Alpha57:  SMA((CLOSE-TSMIN(LOW,9))/(TSMAX(HIGH,9)-TSMIN(LOW,9))*100,3,1)

Alpha58:  COUNT(CLOSE>DELAY(CLOSE,1),20)/20*100

Alpha59:  SUM((CLOSE=DELAY(CLOSE,1)?0:CLOSE-(CLOSE>DELAY(CLOSE,1)?MIN(LOW,DELAY(CLOSE,1)):MAX(HIGH,DELAY(CLOSE,1)))),20)

Alpha60:  SUM(((CLOSE-LOW)-(HIGH-CLOSE))./(HIGH-LOW).*VOLUME,20)

Alpha61:  (MAX(RANK(DECAYLINEAR(DELTA(VWAP, 1), 12)),RANK(DECAYLINEAR(RANK(CORR((LOW),MEAN(VOLUME,80), 8)), 17))) * -1)

Alpha62:  (-1 * CORR(HIGH, RANK(VOLUME), 5))

Alpha63:  SMA(MAX(CLOSE-DELAY(CLOSE,1),0),6,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),6,1)*100

Alpha64:  (MAX(RANK(DECAYLINEAR(CORR(RANK(VWAP), RANK(VOLUME), 4), 4)),RANK(DECAYLINEAR(MAX(CORR(RANK(CLOSE), RANK(MEAN(VOLUME,60)), 4), 13), 14))) * -1)

Alpha65:  MEAN(CLOSE,6)/CLOSE

Alpha66:  (CLOSE-MEAN(CLOSE,6))/MEAN(CLOSE,6)*100

Alpha67:  SMA(MAX(CLOSE-DELAY(CLOSE,1),0),24,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),24,1)*100

Alpha68:  SMA(((HIGH+LOW)/2-(DELAY(HIGH,1)+DELAY(LOW,1))/2)*(HIGH-LOW)/VOLUME,15,2)

Alpha69:  (SUM(DTM,20)>SUM(DBM,20)?(SUM(DTM,20)-SUM(DBM,20))/SUM(DTM,20): (SUM(DTM,20)=SUM(DBM,20)? 0: (SUM(DTM,20)-SUM(DBM,20))/SUM(DBM,20)))

Alpha70:  STD(AMOUNT,6)

Alpha71:  (CLOSE-MEAN(CLOSE,24))/MEAN(CLOSE,24)*100

Alpha72:  SMA((TSMAX(HIGH,6)-CLOSE)/(TSMAX(HIGH,6)-TSMIN(LOW,6))*100,15,1)

Alpha73:  ((TSRANK(DECAYLINEAR(DECAYLINEAR(CORR((CLOSE), VOLUME, 10), 16), 4), 5) - RANK(DECAYLINEAR(CORR(VWAP, MEAN(VOLUME,30), 4),3))) * -1)

Alpha74:  (RANK(CORR(SUM(((LOW * 0.35) + (VWAP * 0.65)), 20), SUM(MEAN(VOLUME,40), 20), 7)) + RANK(CORR(RANK(VWAP), RANK(VOLUME), 6)))

Alpha75:  COUNT(CLOSE>OPEN &BANCHMARKINDEXCLOSE<BANCHMARKINDEXOPEN,50)/COUNT(BANCHMARKINDEXCLOSE<BANCHMARKINDEXOPEN,50)

Alpha76:  STD(ABS((CLOSE/DELAY(CLOSE,1)-1))/VOLUME,20)/MEAN(ABS((CLOSE/DELAY(CLOSE,1)-1))/VOLUME,20)

Alpha77:  MIN(RANK(DECAYLINEAR(((((HIGH + LOW) / 2) + HIGH) -(VWAP + HIGH)), 20)),RANK(DECAYLINEAR(CORR(((HIGH + LOW) / 2), MEAN(VOLUME,40), 3), 6)))

Alpha78:  ((HIGH+LOW+CLOSE)/3-MA((HIGH+LOW+CLOSE)/3,12))/(0.015*MEAN(ABS(CLOSE-MEAN((HIGH+LOW+CLOSE)/3,12)),12))

Alpha79:  SMA(MAX(CLOSE-DELAY(CLOSE,1),0),12,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),12,1)*100

Alpha80:  (VOLUME-DELAY(VOLUME,5))/DELAY(VOLUME,5)*100

Alpha81:  SMA(VOLUME,21,2)

Alpha82:  SMA((TSMAX(HIGH,6)-CLOSE)/(TSMAX(HIGH,6)-TSMIN(LOW,6))*100,20,1)

Alpha83:  (-1 * RANK(COVIANCE(RANK(HIGH), RANK(VOLUME), 5)))

Alpha84:  SUM((CLOSE>DELAY(CLOSE,1)?VOLUME:(CLOSE<DELAY(CLOSE,1)?-VOLUME:0)),20)

Alpha85:  (TSRANK((VOLUME / MEAN(VOLUME,20)), 20) * TSRANK((-1 * DELTA(CLOSE, 7)), 8))

Alpha86:  ((0.25 < (((DELAY(CLOSE, 20) -DELAY(CLOSE, 10)) / 10) -((DELAY(CLOSE, 10) -CLOSE) / 10))) ? (-1 * 1):(((((DELAY(CLOSE, 20) -DELAY(CLOSE, 10)) / 10) -((DELAY(CLOSE, 10) -CLOSE) / 10)) < 0) ? 1 : ((-1 * 1) *(CLOSE -DELAY(CLOSE, 1)))))

Alpha87:  ((RANK(DECAYLINEAR(DELTA(VWAP, 4), 7)) + TSRANK(DECAYLINEAR(((((LOW * 0.9) + (LOW * 0.1)) -VWAP) /(OPEN -((HIGH + LOW) / 2))), 11), 7)) * -1)

Alpha88:  (CLOSE-DELAY(CLOSE,20))/DELAY(CLOSE,20)*100

Alpha89:  2*(SMA(CLOSE,13,2)-SMA(CLOSE,27,2)-SMA(SMA(CLOSE,13,2)-SMA(CLOSE,27,2),10,2))

Alpha90:  ( RANK(CORR(RANK(VWAP), RANK(VOLUME), 5)) * -1)

Alpha91:  ((RANK((CLOSE -MAX(CLOSE, 5)))*RANK(CORR((MEAN(VOLUME,40)), LOW, 5))) * -1)

Alpha92:  (MAX(RANK(DECAYLINEAR(DELTA(((CLOSE * 0.35) + (VWAP *0.65)), 2), 3)),TSRANK(DECAYLINEAR(ABS(CORR((MEAN(VOLUME,180)), CLOSE, 13)), 5), 15)) * -1)

Alpha93:  SUM((OPEN>=DELAY(OPEN,1)?0:MAX((OPEN-LOW),(OPEN-DELAY(OPEN,1)))),20)

Alpha94:  SUM((CLOSE>DELAY(CLOSE,1)?VOLUME:(CLOSE<DELAY(CLOSE,1)?-VOLUME:0)),30)

Alpha95:  STD(AMOUNT,20)

Alpha96:  SMA(SMA((CLOSE-TSMIN(LOW,9))/(TSMAX(HIGH,9)-TSMIN(LOW,9))*100,3,1),3,1)

Alpha97:  STD(VOLUME,10)

Alpha98:  ((((DELTA((SUM(CLOSE, 100) / 100), 100) / DELAY(CLOSE, 100)) < 0.05) || ((DELTA((SUM(CLOSE, 100) / 100), 100) /DELAY(CLOSE, 100)) == 0.05)) ? (-1 * (CLOSE -TSMIN(CLOSE, 100))) : (-1 * DELTA(CLOSE, 3)))

Alpha99:  (-1 * RANK(COVIANCE(RANK(CLOSE), RANK(VOLUME), 5)))

Alpha100: STD(VOLUME,20)

Alpha101: ((RANK(CORR(CLOSE, SUM(MEAN(VOLUME,30), 37), 15)) < RANK(CORR(RANK(((HIGH * 0.1) + (VWAP * 0.9))),RANK(VOLUME), 11))) * -1)

Alpha102: SMA(MAX(VOLUME-DELAY(VOLUME,1),0),6,1)/SMA(ABS(VOLUME-DELAY(VOLUME,1)),6,1)*100

Alpha103: ((20-LOWDAY(LOW,20))/20)*100

Alpha104: (-1 * (DELTA(CORR(HIGH, VOLUME, 5), 5) * RANK(STD(CLOSE, 20))))

Alpha105: (-1 * CORR(RANK(OPEN), RANK(VOLUME), 10))

Alpha106: CLOSE-DELAY(CLOSE,20)

Alpha107: (((-1 * RANK((OPEN -DELAY(HIGH, 1)))) * RANK((OPEN -DELAY(CLOSE, 1)))) *RANK((OPEN -DELAY(LOW, 1))))

Alpha108: ((RANK((HIGH -MIN(HIGH, 2)))^RANK(CORR((VWAP), (MEAN(VOLUME,120)), 6))) * -1)

Alpha109: SMA(HIGH-LOW,10,2)/SMA(SMA(HIGH-LOW,10,2),10,2)

Alpha110: SUM(MAX(0,HIGH-DELAY(CLOSE,1)),20)/SUM(MAX(0,DELAY(CLOSE,1)-LOW),20)*100

Alpha111: SMA(VOL*((CLOSE-LOW)-(HIGH-CLOSE))/(HIGH-LOW),11,2)-SMA(VOL*((CLOSE-LOW)-(HIGH-CLOSE))/(HIGH-LOW),4,2)

Alpha112: (SUM((CLOSE-DELAY(CLOSE,1)>0?CLOSE-DELAY(CLOSE,1):0),12)-SUM((CLOSE-DELAY(CLOSE,1)<0?ABS(CLOSE-DELAY(CLOSE,1)):0),12))/(SUM((CLOSE-DELAY(CLOSE,1)>0?CLOSE-DELAY(CLOSE,1):0),12)+SUM((CLOSE-DELAY(CLOSE,1)<0?ABS(CLOSE-DELAY(CLOSE,1)):0),12))*100

Alpha113: (-1 * ((RANK((SUM(DELAY(CLOSE, 5), 20) / 20)) * CORR(CLOSE, VOLUME, 2)) *RANK(CORR(SUM(CLOSE, 5),SUM(CLOSE, 20), 2))))

Alpha114: ((RANK(DELAY(((HIGH -LOW) / (SUM(CLOSE, 5) / 5)), 2)) * RANK(RANK(VOLUME))) / (((HIGH -LOW) /(SUM(CLOSE, 5) / 5)) / (VWAP -CLOSE)))

Alpha115: (RANK(CORR(((HIGH * 0.9) + (CLOSE * 0.1)), MEAN(VOLUME,30), 10))^RANK(CORR(TSRANK(((HIGH + LOW) /2), 4), TSRANK(VOLUME, 10), 7)))

Alpha116: REGBETA(CLOSE,SEQUENCE,20)

Alpha117: ((TSRANK(VOLUME, 32) * (1 -TSRANK(((CLOSE + HIGH) -LOW), 16))) * (1 -TSRANK(RET, 32)))

Alpha118: SUM(HIGH-OPEN,20)/SUM(OPEN-LOW,20)*100

Alpha119: (RANK(DECAYLINEAR(CORR(VWAP, SUM(MEAN(VOLUME,5), 26), 5), 7)) -RANK(DECAYLINEAR(TSRANK(MIN(CORR(RANK(OPEN), RANK(MEAN(VOLUME,15)), 21), 9), 7), 8)))

Alpha120: (RANK((VWAP -CLOSE)) / RANK((VWAP + CLOSE)))

Alpha121: ((RANK((VWAP -MIN(VWAP, 12)))^TSRANK(CORR(TSRANK(VWAP, 20), TSRANK(MEAN(VOLUME,60), 2), 18), 3)) * -1)

Alpha122: (SMA(SMA(SMA(LOG(CLOSE),13,2),13,2),13,2)-DELAY(SMA(SMA(SMA(LOG(CLOSE),13,2),13,2),13,2),1))/DELAY(SMA(SMA(SMA(LOG(CLOSE),13,2),13,2),13,2),1)

Alpha123: ((RANK(CORR(SUM(((HIGH + LOW) / 2), 20), SUM(MEAN(VOLUME,60), 20), 9))<RANK(CORR(LOW, VOLUME,6))) * -1)

Alpha124: (CLOSE -VWAP) / DECAYLINEAR(RANK(TSMAX(CLOSE, 30)),2)

Alpha125: (RANK(DECAYLINEAR(CORR((VWAP), MEAN(VOLUME,80),17), 20)) / RANK(DECAYLINEAR(DELTA(((CLOSE * 0.5)+ (VWAP * 0.5)), 3), 16)))

Alpha126: (CLOSE+HIGH+LOW)/3

Alpha127: (MEAN((100*(CLOSE-MAX(CLOSE,12))/(MAX(CLOSE,12)))^2))^(1/2)

Alpha128: 100-(100/(1+SUM(((HIGH+LOW+CLOSE)/3>DELAY((HIGH+LOW+CLOSE)/3,1)?(HIGH+LOW+CLOSE)/3*VOLUME:0),14)/SUM(((HIGH+LOW+CLOSE)/3<DELAY((HIGH+LOW+CLOSE)/3,1)?(HIGH+LOW+CLOSE)/3*VOLUME:0),14)))

Alpha129: SUM((CLOSE-DELAY(CLOSE,1)<0?ABS(CLOSE-DELAY(CLOSE,1)):0),12)

Alpha130: (RANK(DECAYLINEAR(CORR(((HIGH + LOW) / 2), MEAN(VOLUME,40), 9), 10)) /RANK(DECAYLINEAR(CORR(RANK(VWAP), RANK(VOLUME), 7),3)))

Alpha131: (RANK(DELAT(VWAP, 1))^TSRANK(CORR(CLOSE,MEAN(VOLUME,50), 18), 18))

Alpha132: MEAN(AMOUNT,20)

Alpha133: ((20-HIGHDAY(HIGH,20))/20)*100-((20-LOWDAY(LOW,20))/20)*100

Alpha134: (CLOSE-DELAY(CLOSE,12))/DELAY(CLOSE,12)*VOLUME

Alpha135: SMA(DELAY(CLOSE/DELAY(CLOSE,20),1),20,1)

Alpha136: ((-1 * RANK(DELTA(RET, 3))) * CORR(OPEN, VOLUME, 10))

Alpha137: 16*(CLOSE-DELAY(CLOSE,1)+(CLOSE-OPEN)/2+DELAY(CLOSE,1)-DELAY(OPEN,1))/((ABS(HIGH-DELAY(CLOSE,1))>ABS(LOW-DELAY(CLOSE,1)) &ABS(HIGH-DELAY(CLOSE,1))>ABS(HIGH-DELAY(LOW,1))?ABS(HIGH-DELAY(CLOSE,1))+ABS(LOW-DELAY(CLOSE,1))/2+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4:(ABS(LOW-DELAY(CLOSE,1))>ABS(HIGH-DELAY(LOW,1)) &ABS(LOW-DELAY(CLOSE,1))>ABS(HIGH-DELAY(CLOSE,1))?ABS(LOW-DELAY(CLOSE,1))+ABS(HIGH-DELAY(CLOSE,1))/2+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4:ABS(HIGH-DELAY(LOW,1))+ABS(DELAY(CLOSE,1)-DELAY(OPEN,1))/4)))*MAX(ABS(HIGH-DELAY(CLOSE,1)),ABS(LOW-DELAY(CLOSE,1)))

Alpha138: ((RANK(DECAYLINEAR(DELTA((((LOW * 0.7) + (VWAP *0.3))), 3), 20)) -TSRANK(DECAYLINEAR(TSRANK(CORR(TSRANK(LOW, 8), TSRANK(MEAN(VOLUME,60), 17), 5), 19), 16), 7)) * -1)

Alpha139: (-1 * CORR(OPEN, VOLUME, 10))

Alpha140: MIN(RANK(DECAYLINEAR(((RANK(OPEN) + RANK(LOW)) -(RANK(HIGH) + RANK(CLOSE))), 8)),TSRANK(DECAYLINEAR(CORR(TSRANK(CLOSE, 8), TSRANK(MEAN(VOLUME,60), 20), 8), 7), 3))

Alpha141: (RANK(CORR(RANK(HIGH), RANK(MEAN(VOLUME,15)), 9))* -1)

Alpha142: (((-1 * RANK(TSRANK(CLOSE, 10))) * RANK(DELTA(DELTA(CLOSE, 1), 1))) *RANK(TSRANK((VOLUME/MEAN(VOLUME,20)), 5)))

Alpha143: CLOSE>DELAY(CLOSE,1)?(CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)*SELF:SELF

Alpha144: SUMIF(ABS(CLOSE/DELAY(CLOSE,1)-1)/AMOUNT,20,CLOSE<DELAY(CLOSE,1))/COUNT(CLOSE<DELAY(CLOSE,1),20)

Alpha145: (MEAN(VOLUME,9)-MEAN(VOLUME,26))/MEAN(VOLUME,12)*100

Alpha146: MEAN((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)-SMA((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1),61,2),20)*((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)-SMA((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1),61,2))/SMA(((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)-((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)-SMA((CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1),61,2)))^2,60)

Alpha147: REGBETA(MEAN(CLOSE,12),SEQUENCE(12))

Alpha148: ((RANK(CORR((OPEN), SUM(MEAN(VOLUME,60), 9), 6)) < RANK((OPEN -TSMIN(OPEN, 14)))) * -1)

Alpha149: REGBETA(FILTER(CLOSE/DELAY(CLOSE,1)-1,BANCHMARKINDEXCLOSE<DELAY(BANCHMARKINDEXCLOSE,1)),FILTER(BANCHMARKINDEXCLOSE/DELAY(BANCHMARKINDEXCLOSE,1)-1,BANCHMARKINDEXCLOSE<DELAY(BANCHMARKINDEXCLOSE,1)),252)

Alpha150: (CLOSE+HIGH+LOW)/3*VOLUME

Alpha151: SMA(CLOSE-DELAY(CLOSE,20),20,1)

Alpha152: SMA(MEAN(DELAY(SMA(DELAY(CLOSE/DELAY(CLOSE,9),1),9,1),1),12)-MEAN(DELAY(SMA(DELAY(CLOSE/DELAY(CLOSE,9),1),9,1),1),26),9,1)

Alpha153: (MEAN(CLOSE,3)+MEAN(CLOSE,6)+MEAN(CLOSE,12)+MEAN(CLOSE,24))/4

Alpha154: (((VWAP -MIN(VWAP, 16))) < (CORR(VWAP, MEAN(VOLUME,180), 18)))

Alpha155: SMA(VOLUME,13,2)-SMA(VOLUME,27,2)-SMA(SMA(VOLUME,13,2)-SMA(VOLUME,27,2),10,2)

Alpha156: (MAX(RANK(DECAYLINEAR(DELTA(VWAP, 5), 3)), RANK(DECAYLINEAR(((DELTA(((OPEN * 0.15) + (LOW *0.85)),2) / ((OPEN * 0.15) + (LOW * 0.85))) * -1), 3))) * -1)

Alpha157: (MIN(PROD(RANK(RANK(LOG(SUM(TSMIN(RANK(RANK((-1 * RANK(DELTA((CLOSE -1), 5))))), 2), 1)))), 1), 5) +TSRANK(DELAY((-1 * RET), 6), 5))

Alpha158: ((HIGH-SMA(CLOSE,15,2))-(LOW-SMA(CLOSE,15,2)))/CLOSE

Alpha159: ((CLOSE-SUM(MIN(LOW,DELAY(CLOSE,1)),6))/SUM(MAX(HGIH,DELAY(CLOSE,1))-MIN(LOW,DELAY(CLOSE,1)),6)*12*24+(CLOSE-SUM(MIN(LOW,DELAY(CLOSE,1)),12))/SUM(MAX(HGIH,DELAY(CLOSE,1))-MIN(LOW,DELAY(CLOSE,1)),12)*6*24+(CLOSE-SUM(MIN(LOW,DELAY(CLOSE,1)),24))/SUM(MAX(HGIH,DELAY(CLOSE,1))-MIN(LOW,DELAY(CLOSE,1)),24)*6*24)*100/(6*12+6*24+12*24)

Alpha160: SMA((CLOSE<=DELAY(CLOSE,1)?STD(CLOSE,20):0),20,1)

Alpha161: MEAN(MAX(MAX((HIGH-LOW),ABS(DELAY(CLOSE,1)-HIGH)),ABS(DELAY(CLOSE,1)-LOW)),12)

Alpha162: (SMA(MAX(CLOSE-DELAY(CLOSE,1),0),12,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),12,1)*100-MIN(SMA(MAX(CLOSE-DELAY(CLOSE,1),0),12,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),12,1)*100,12))/(MAX(SMA(MAX(CLOSE-DELAY(CLOSE,1),0),12,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),12,1)*100,12)-MIN(SMA(MAX(CLOSE-DELAY(CLOSE,1),0),12,1)/SMA(ABS(CLOSE-DELAY(CLOSE,1)),12,1)*100,12))

Alpha163: RANK(((((-1 * RET) * MEAN(VOLUME,20)) * VWAP) * (HIGH -CLOSE)))

Alpha164: SMA((((CLOSE>DELAY(CLOSE,1))?1/(CLOSE-DELAY(CLOSE,1)):1)-MIN(((CLOSE>DELAY(CLOSE,1))?1/(CLOSE-DELAY(CLOSE,1)):1),12))/(HIGH-LOW)*100,13,2)

Alpha165: MAX(SUMAC(CLOSE-MEAN(CLOSE,48)))-MIN(SUMAC(CLOSE-MEAN(CLOSE,48)))/STD(CLOSE,48)

Alpha166: -20*（20-1 ）^1.5*SUM(CLOSE/DELAY(CLOSE,1)-1-MEAN(CLOSE/DELAY(CLOSE,1)-1,20),20)/((20-1)*(20-2)(SUM((CLOSE/DELAY(CLOSE,1),20)^2,20))^1.5)

Alpha167: SUM((CLOSE-DELAY(CLOSE,1)>0?CLOSE-DELAY(CLOSE,1):0),12)

Alpha168: (-1*VOLUME/MEAN(VOLUME,20))

Alpha169: SMA(MEAN(DELAY(SMA(CLOSE-DELAY(CLOSE,1),9,1),1),12)-MEAN(DELAY(SMA(CLOSE-DELAY(CLOSE,1),9,1),1),26),10,1)

Alpha170: ((((RANK((1 / CLOSE)) * VOLUME) / MEAN(VOLUME,20)) * ((HIGH * RANK((HIGH -CLOSE))) / (SUM(HIGH, 5) /5))) -RANK((VWAP -DELAY(VWAP, 5))))

Alpha171: ((-1 * ((LOW -CLOSE) * (OPEN^5))) / ((CLOSE -HIGH) * (CLOSE^5)))

Alpha172: MEAN(ABS(SUM((LD>0 & LD>HD)?LD:0,14)*100/SUM(TR,14)-SUM((HD>0 &HD>LD)?HD:0,14)*100/SUM(TR,14))/(SUM((LD>0 & LD>HD)?LD:0,14)*100/SUM(TR,14)+SUM((HD>0 &HD>LD)?HD:0,14)*100/SUM(TR,14))*100,6)

Alpha173: 3*SMA(CLOSE,13,2)-2*SMA(SMA(CLOSE,13,2),13,2)+SMA(SMA(SMA(LOG(CLOSE),13,2),13,2),13,2)

Alpha174: SMA((CLOSE>DELAY(CLOSE,1)?STD(CLOSE,20):0),20,1)

Alpha175: MEAN(MAX(MAX((HIGH-LOW),ABS(DELAY(CLOSE,1)-HIGH)),ABS(DELAY(CLOSE,1)-LOW)),6)

Alpha176: CORR(RANK(((CLOSE -TSMIN(LOW, 12)) / (TSMAX(HIGH, 12) -TSMIN(LOW,12)))),RANK(VOLUME), 6)

Alpha177: ((20-HIGHDAY(HIGH,20))/20)*100

Alpha178: (CLOSE-DELAY(CLOSE,1))/DELAY(CLOSE,1)*VOLUME

Alpha179: (RANK(CORR(VWAP, VOLUME, 4)) *RANK(CORR(RANK(LOW),RANK(MEAN(VOLUME,50)), 12)))

Alpha180: ((MEAN(VOLUME,20) < VOLUME) ? ((-1 * TSRANK(ABS(DELTA(CLOSE, 7)), 60)) *SIGN(DELTA(CLOSE, 7)) : (-1 *VOLUME)))

Alpha181: SUM(((CLOSE/DELAY(CLOSE,1)-1)-MEAN((CLOSE/DELAY(CLOSE,1)-1),20))-(BANCHMARKINDEXCLOSE-MEAN(BANCHMARKINDEXCLOSE,20))^2,20)/SUM((BANCHMARKINDEXCLOSE-MEAN(BANCHMARKINDEXCLOSE,20))^3)

Alpha182: COUNT((CLOSE>OPEN & BANCHMARKINDEXCLOSE>BANCHMARKINDEXOPEN)OR(CLOSE<OPEN &BANCHMARKINDEXCLOSE<BANCHMARKINDEXOPEN),20)/20

Alpha183: MAX(SUMAC(CLOSE-MEAN(CLOSE,24)))-MIN(SUMAC(CLOSE-MEAN(CLOSE,24)))/STD(CLOSE,24)

Alpha184: (RANK(CORR(DELAY((OPEN -CLOSE), 1), CLOSE, 200)) + RANK((OPEN -CLOSE)))

Alpha185: RANK((-1 * ((1 -(OPEN / CLOSE))^2)))

Alpha186: (MEAN(ABS(SUM((LD>0 & LD>HD)?LD:0,14)*100/SUM(TR,14)-SUM((HD>0 &HD>LD)?HD:0,14)*100/SUM(TR,14))/(SUM((LD>0 &LD>HD)?LD:0,14)*100/SUM(TR,14)+SUM((HD>0 &HD>LD)?HD:0,14)*100/SUM(TR,14))*100,6)+DELAY(MEAN(ABS(SUM((LD>0 &LD>HD)?LD:0,14)*100/SUM(TR,14)-SUM((HD>0 & HD>LD)?HD:0,14)*100/SUM(TR,14))/(SUM((LD>0&LD>HD)?LD:0,14)*100/SUM(TR,14)+SUM((HD>0 & HD>LD)?HD:0,14)*100/SUM(TR,14))*100,6),6))/2

Alpha187: SUM((OPEN<=DELAY(OPEN,1)?0:MAX((HIGH-OPEN),(OPEN-DELAY(OPEN,1)))),20)

Alpha188: ((HIGH-LOW–SMA(HIGH-LOW,11,2))/SMA(HIGH-LOW,11,2))*100

Alpha189: MEAN(ABS(CLOSE-MEAN(CLOSE,6)),6)

Alpha190: LOG((COUNT(CLOSE/DELAY(CLOSE)-1>((CLOSE/DELAY(CLOSE,19))^(1/20)-1),20)-1)*(SUMIF(((CLOSE/DELAY(CLOSE)-1-(CLOSE/DELAY(CLOSE,19))^(1/20)-1))^2,20,CLOSE/DELAY(CLOSE)-1<(CLOSE/DELAY(CLOSE,19))^(1/20)-1))/((COUNT((CLOSE/DELAY(CLOSE)-1<(CLOSE/DELAY(CLOSE,19))^(1/20)-1),20))*(SUMIF((CLOSE/DELAY(CLOSE)-1-((CLOSE/DELAY(CLOSE,19))^(1/20)-1))^2,20,CLOSE/DELAY(CLOSE)-1>(CLOSE/DELAY(CLOSE,19))^(1/20)-1))))

Alpha191: ((CORR(MEAN(VOLUME,20), LOW, 5) + ((HIGH + LOW) / 2)) -CLOSE)
```



```
Alpha#1: (rank(Ts_ArgMax(SignedPower(((returns < 0) ? stddev(returns, 20) : close), 2.), 5)) - 0.5) 
Alpha#2: (-1 * correlation(rank(delta(log(volume), 2)), rank(((close - open) / open)), 6)) 
Alpha#3: (-1 * correlation(rank(open), rank(volume), 10)) 
Alpha#4: (-1 * Ts_Rank(rank(low), 9)) 
Alpha#5: (rank((open - (sum(vwap, 10) / 10))) * (-1 * abs(rank((close - vwap))))) 
Alpha#6: (-1 * correlation(open, volume, 10)) 
Alpha#7: ((adv20 < volume) ? ((-1 * ts_rank(abs(delta(close, 7)), 60)) * sign(delta(close, 7))) : (-1 * 1)) 
Alpha#8: (-1 * rank(((sum(open, 5) * sum(returns, 5)) - delay((sum(open, 5) * sum(returns, 5)), 10)))) 
Alpha#9: ((0 < ts_min(delta(close, 1), 5)) ? delta(close, 1) : ((ts_max(delta(close, 1), 5) < 0) ? delta(close, 1) : (-1 * delta(close, 1)))) 
Alpha#10: rank(((0 < ts_min(delta(close, 1), 4)) ? delta(close, 1) : ((ts_max(delta(close, 1), 4) < 0) ? delta(close, 1) : (-1 * delta(close, 1))))) 
Alpha#11: ((rank(ts_max((vwap - close), 3)) + rank(ts_min((vwap - close), 3))) * rank(delta(volume, 3))) 
Alpha#12: (sign(delta(volume, 1)) * (-1 * delta(close, 1))) 
Alpha#13: (-1 * rank(covariance(rank(close), rank(volume), 5))) 
Alpha#14: ((-1 * rank(delta(returns, 3))) * correlation(open, volume, 10)) 
Alpha#15: (-1 * sum(rank(correlation(rank(high), rank(volume), 3)), 3)) 
Alpha#16: (-1 * rank(covariance(rank(high), rank(volume), 5))) 
Alpha#17: (((-1 * rank(ts_rank(close, 10))) * rank(delta(delta(close, 1), 1))) * rank(ts_rank((volume / adv20), 5))) 
Alpha#18: (-1 * rank(((stddev(abs((close - open)), 5) + (close - open)) + correlation(close, open, 10)))) 
Alpha#19: ((-1 * sign(((close - delay(close, 7)) + delta(close, 7)))) * (1 + rank((1 + sum(returns, 250))))) 
Alpha#20: (((-1 * rank((open - delay(high, 1)))) * rank((open - delay(close, 1)))) * rank((open - delay(low, 1)))) 
Alpha#21: ((((sum(close, 8) / 8) + stddev(close, 8)) < (sum(close, 2) / 2)) ? (-1 * 1) : (((sum(close, 2) / 2) < ((sum(close, 8) / 8) - stddev(close, 8))) ? 1 : (((1 < (volume / adv20)) || ((volume / adv20) == 1)) ? 1 : (-1 * 1)))) 
Alpha#22: (-1 * (delta(correlation(high, volume, 5), 5) * rank(stddev(close, 20)))) 
Alpha#23: (((sum(high, 20) / 20) < high) ? (-1 * delta(high, 2)) : 0) 
Alpha#24: ((((delta((sum(close, 100) / 100), 100) / delay(close, 100)) < 0.05) || ((delta((sum(close, 100) / 100), 100) / delay(close, 100)) == 0.05)) ? (-1 * (close - ts_min(close, 100))) : (-1 * delta(close, 3))) 
Alpha#25: rank(((((-1 * returns) * adv20) * vwap) * (high - close))) 
Alpha#26: (-1 * ts_max(correlation(ts_rank(volume, 5), ts_rank(high, 5), 5), 3)) 
Alpha#27: ((0.5 < rank((sum(correlation(rank(volume), rank(vwap), 6), 2) / 2.0))) ? (-1 * 1) : 1) 
Alpha#28: scale(((correlation(adv20, low, 5) + ((high + low) / 2)) - close)) 
Alpha#29: (min(product(rank(rank(scale(log(sum(ts_min(rank(rank((-1 * rank(delta((close - 1), 5))))), 2), 1))))), 1), 5) + ts_rank(delay((-1 * returns), 6), 5)) 
Alpha#30: (((1.0 - rank(((sign((close - delay(close, 1))) + sign((delay(close, 1) - delay(close, 2)))) + sign((delay(close, 2) - delay(close, 3)))))) * sum(volume, 5)) / sum(volume, 20)) 
Alpha#31: ((rank(rank(rank(decay_linear((-1 * rank(rank(delta(close, 10)))), 10)))) + rank((-1 * delta(close, 3)))) + sign(scale(correlation(adv20, low, 12)))) 
Alpha#32: (scale(((sum(close, 7) / 7) - close)) + (20 * scale(correlation(vwap, delay(close, 5), 230)))) 
Alpha#33: rank((-1 * ((1 - (open / close))^1))) 
Alpha#34: rank(((1 - rank((stddev(returns, 2) / stddev(returns, 5)))) + (1 - rank(delta(close, 1)))))
Alpha#35: ((Ts_Rank(volume, 32) * (1 - Ts_Rank(((close + high) - low), 16))) * (1 - Ts_Rank(returns, 32))) 
Alpha#36: (((((2.21 * rank(correlation((close - open), delay(volume, 1), 15))) + (0.7 * rank((open - close)))) + (0.73 * rank(Ts_Rank(delay((-1 * returns), 6), 5)))) + rank(abs(correlation(vwap, adv20, 6)))) + (0.6 * rank((((sum(close, 200) / 200) - open) * (close - open))))) 
Alpha#37: (rank(correlation(delay((open - close), 1), close, 200)) + rank((open - close))) 
Alpha#38: ((-1 * rank(Ts_Rank(close, 10))) * rank((close / open))) 
Alpha#39: ((-1 * rank((delta(close, 7) * (1 - rank(decay_linear((volume / adv20), 9)))))) * (1 + rank(sum(returns, 250)))) 
Alpha#40: ((-1 * rank(stddev(high, 10))) * correlation(high, volume, 10)) 
Alpha#41: (((high * low)^0.5) - vwap) 
Alpha#42: (rank((vwap - close)) / rank((vwap + close))) 
Alpha#43: (ts_rank((volume / adv20), 20) * ts_rank((-1 * delta(close, 7)), 8))
Alpha#44: (-1 * correlation(high, rank(volume), 5)) 
Alpha#45: (-1 * ((rank((sum(delay(close, 5), 20) / 20)) * correlation(close, volume, 2)) * rank(correlation(sum(close, 5), sum(close, 20), 2)))) 
Alpha#46: ((0.25 < (((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10))) ? (-1 * 1) : (((((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10)) < 0) ? 1 : ((-1 * 1) * (close - delay(close, 1))))) 
Alpha#47: ((((rank((1 / close)) * volume) / adv20) * ((high * rank((high - close))) / (sum(high, 5) / 5))) - rank((vwap - delay(vwap, 5)))) 
Alpha#48: (indneutralize(((correlation(delta(close, 1), delta(delay(close, 1), 1), 250) * delta(close, 1)) / close), IndClass.subindustry) / sum(((delta(close, 1) / delay(close, 1))^2), 250)) 
Alpha#49: (((((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10)) < (-1 * 0.1)) ? 1 : ((-1 * 1) * (close - delay(close, 1)))) 
Alpha#50: (-1 * ts_max(rank(correlation(rank(volume), rank(vwap), 5)), 5)) 
Alpha#51: (((((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10)) < (-1 * 0.05)) ? 1 : ((-1 * 1) * (close - delay(close, 1)))) 
Alpha#52: ((((-1 * ts_min(low, 5)) + delay(ts_min(low, 5), 5)) * rank(((sum(returns, 240) - sum(returns, 20)) / 220))) * ts_rank(volume, 5)) 
Alpha#53: (-1 * delta((((close - low) - (high - close)) / (close - low)), 9)) 
Alpha#54: ((-1 * ((low - close) * (open^5))) / ((low - high) * (close^5))) 
Alpha#55: (-1 * correlation(rank(((close - ts_min(low, 12)) / (ts_max(high, 12) - ts_min(low, 12)))), rank(volume), 6)) 
Alpha#56: (0 - (1 * (rank((sum(returns, 10) / sum(sum(returns, 2), 3))) * rank((returns * cap))))) 
Alpha#57: (0 - (1 * ((close - vwap) / decay_linear(rank(ts_argmax(close, 30)), 2)))) 
Alpha#58: (-1 * Ts_Rank(decay_linear(correlation(IndNeutralize(vwap, IndClass.sector), volume, 3.92795), 7.89291), 5.50322)) 
Alpha#59: (-1 * Ts_Rank(decay_linear(correlation(IndNeutralize(((vwap * 0.728317) + (vwap * (1 - 0.728317))), IndClass.industry), volume, 4.25197), 16.2289), 8.19648)) 
Alpha#60: (0 - (1 * ((2 * scale(rank(((((close - low) - (high - close)) / (high - low)) * volume)))) - scale(rank(ts_argmax(close, 10))))))
Alpha#61: (rank((vwap - ts_min(vwap, 16.1219))) < rank(correlation(vwap, adv180, 17.9282))) 
Alpha#62: ((rank(correlation(vwap, sum(adv20, 22.4101), 9.91009)) < rank(((rank(open) + rank(open)) < (rank(((high + low) / 2)) + rank(high))))) * -1) 
Alpha#63: ((rank(decay_linear(delta(IndNeutralize(close, IndClass.industry), 2.25164), 8.22237)) - rank(decay_linear(correlation(((vwap * 0.318108) + (open * (1 - 0.318108))), sum(adv180, 37.2467), 13.557), 12.2883))) * -1) 
Alpha#64: ((rank(correlation(sum(((open * 0.178404) + (low * (1 - 0.178404))), 12.7054), sum(adv120, 12.7054), 16.6208)) < rank(delta(((((high + low) / 2) * 0.178404) + (vwap * (1 - 0.178404))), 3.69741))) * -1) 
Alpha#65: ((rank(correlation(((open * 0.00817205) + (vwap * (1 - 0.00817205))), sum(adv60, 8.6911), 6.40374)) < rank((open - ts_min(open, 13.635)))) * -1) 
Alpha#66: ((rank(decay_linear(delta(vwap, 3.51013), 7.23052)) + Ts_Rank(decay_linear(((((low * 0.96633) + (low * (1 - 0.96633))) - vwap) / (open - ((high + low) / 2))), 11.4157), 6.72611)) * -1) 
Alpha#67: ((rank((high - ts_min(high, 2.14593)))^rank(correlation(IndNeutralize(vwap, IndClass.sector), IndNeutralize(adv20, IndClass.subindustry), 6.02936))) * -1) 
Alpha#68: ((Ts_Rank(correlation(rank(high), rank(adv15), 8.91644), 13.9333) < rank(delta(((close * 0.518371) + (low * (1 - 0.518371))), 1.06157))) * -1) 
Alpha#69: ((rank(ts_max(delta(IndNeutralize(vwap, IndClass.industry), 2.72412), 4.79344))^Ts_Rank(correlation(((close * 0.490655) + (vwap * (1 - 0.490655))), adv20, 4.92416), 9.0615)) * -1) 
Alpha#70: ((rank(delta(vwap, 1.29456))^Ts_Rank(correlation(IndNeutralize(close, IndClass.industry), adv50, 17.8256), 17.9171)) * -1) 
Alpha#71: max(Ts_Rank(decay_linear(correlation(Ts_Rank(close, 3.43976), Ts_Rank(adv180, 12.0647), 18.0175), 4.20501), 15.6948), Ts_Rank(decay_linear((rank(((low + open) - (vwap + vwap)))^2), 16.4662), 4.4388)) 
Alpha#72: (rank(decay_linear(correlation(((high + low) / 2), adv40, 8.93345), 10.1519)) / rank(decay_linear(correlation(Ts_Rank(vwap, 3.72469), Ts_Rank(volume, 18.5188), 6.86671), 2.95011))) 
Alpha#73: (max(rank(decay_linear(delta(vwap, 4.72775), 2.91864)), Ts_Rank(decay_linear(((delta(((open * 0.147155) + (low * (1 - 0.147155))), 2.03608) / ((open * 0.147155) + (low * (1 - 0.147155)))) * -1), 3.33829), 16.7411)) * -1) 
Alpha#74: ((rank(correlation(close, sum(adv30, 37.4843), 15.1365)) < rank(correlation(rank(((high * 0.0261661) + (vwap * (1 - 0.0261661)))), rank(volume), 11.4791))) * -1) 
Alpha#75: (rank(correlation(vwap, volume, 4.24304)) < rank(correlation(rank(low), rank(adv50), 12.4413))) 
Alpha#76: (max(rank(decay_linear(delta(vwap, 1.24383), 11.8259)), Ts_Rank(decay_linear(Ts_Rank(correlation(IndNeutralize(low, IndClass.sector), adv81, 8.14941), 19.569), 17.1543), 19.383)) * -1) 
Alpha#77: min(rank(decay_linear(((((high + low) / 2) + high) - (vwap + high)), 20.0451)), rank(decay_linear(correlation(((high + low) / 2), adv40, 3.1614), 5.64125))) 
Alpha#78: (rank(correlation(sum(((low * 0.352233) + (vwap * (1 - 0.352233))), 19.7428), sum(adv40, 19.7428), 6.83313))^rank(correlation(rank(vwap), rank(volume), 5.77492))) 
Alpha#79: (rank(delta(IndNeutralize(((close * 0.60733) + (open * (1 - 0.60733))), IndClass.sector), 1.23438)) < rank(correlation(Ts_Rank(vwap, 3.60973), Ts_Rank(adv150, 9.18637), 14.6644))) 
Alpha#80: ((rank(Sign(delta(IndNeutralize(((open * 0.868128) + (high * (1 - 0.868128))), IndClass.industry), 4.04545)))^Ts_Rank(correlation(high, adv10, 5.11456), 5.53756)) * -1) 
Alpha#81: ((rank(Log(product(rank((rank(correlation(vwap, sum(adv10, 49.6054), 8.47743))^4)), 14.9655))) < rank(correlation(rank(vwap), rank(volume), 5.07914))) * -1) 
Alpha#82: (min(rank(decay_linear(delta(open, 1.46063), 14.8717)), Ts_Rank(decay_linear(correlation(IndNeutralize(volume, IndClass.sector), ((open * 0.634196) + (open * (1 - 0.634196))), 17.4842), 6.92131), 13.4283)) * -1) 
Alpha#83: ((rank(delay(((high - low) / (sum(close, 5) / 5)), 2)) * rank(rank(volume))) / (((high - low) / (sum(close, 5) / 5)) / (vwap - close))) 
Alpha#84: SignedPower(Ts_Rank((vwap - ts_max(vwap, 15.3217)), 20.7127), delta(close, 4.96796)) 
Alpha#85: (rank(correlation(((high * 0.876703) + (close * (1 - 0.876703))), adv30, 9.61331))^rank(correlation(Ts_Rank(((high + low) / 2), 3.70596), Ts_Rank(volume, 10.1595), 7.11408))) 
Alpha#86: ((Ts_Rank(correlation(close, sum(adv20, 14.7444), 6.00049), 20.4195) < rank(((open + close) - (vwap + open)))) * -1) 
Alpha#87: (max(rank(decay_linear(delta(((close * 0.369701) + (vwap * (1 - 0.369701))), 1.91233), 2.65461)), Ts_Rank(decay_linear(abs(correlation(IndNeutralize(adv81, IndClass.industry), close, 13.4132)), 4.89768), 14.4535)) * -1) 
Alpha#88: min(rank(decay_linear(((rank(open) + rank(low)) - (rank(high) + rank(close))), 8.06882)), Ts_Rank(decay_linear(correlation(Ts_Rank(close, 8.44728), Ts_Rank(adv60, 20.6966), 8.01266), 6.65053), 2.61957)) 
Alpha#89: (Ts_Rank(decay_linear(correlation(((low * 0.967285) + (low * (1 - 0.967285))), adv10, 6.94279), 5.51607), 3.79744) - Ts_Rank(decay_linear(delta(IndNeutralize(vwap, IndClass.industry), 3.48158), 10.1466), 15.3012)) 
Alpha#90: ((rank((close - ts_max(close, 4.66719)))^Ts_Rank(correlation(IndNeutralize(adv40, IndClass.subindustry), low, 5.38375), 3.21856)) * -1) 
Alpha#91: ((Ts_Rank(decay_linear(decay_linear(correlation(IndNeutralize(close, IndClass.industry), volume, 9.74928), 16.398), 3.83219), 4.8667) - rank(decay_linear(correlation(vwap, adv30, 4.01303), 2.6809))) * -1) 
Alpha#92: min(Ts_Rank(decay_linear(((((high + low) / 2) + close) < (low + open)), 14.7221), 18.8683), Ts_Rank(decay_linear(correlation(rank(low), rank(adv30), 7.58555), 6.94024), 6.80584)) 
Alpha#93: (Ts_Rank(decay_linear(correlation(IndNeutralize(vwap, IndClass.industry), adv81, 17.4193), 19.848), 7.54455) / rank(decay_linear(delta(((close * 0.524434) + (vwap * (1 - 0.524434))), 2.77377), 16.2664))) 
Alpha#94: ((rank((vwap - ts_min(vwap, 11.5783)))^Ts_Rank(correlation(Ts_Rank(vwap, 19.6462), Ts_Rank(adv60, 4.02992), 18.0926), 2.70756)) * -1) 
Alpha#95: (rank((open - ts_min(open, 12.4105))) < Ts_Rank((rank(correlation(sum(((high + low) / 2), 19.1351), sum(adv40, 19.1351), 12.8742))^5), 11.7584)) 
Alpha#96: (max(Ts_Rank(decay_linear(correlation(rank(vwap), rank(volume), 3.83878), 4.16783), 8.38151), Ts_Rank(decay_linear(Ts_ArgMax(correlation(Ts_Rank(close, 7.45404), Ts_Rank(adv60, 4.13242), 3.65459), 12.6556), 14.0365), 13.4143)) * -1) 
Alpha#97: ((rank(decay_linear(delta(IndNeutralize(((low * 0.721001) + (vwap * (1 - 0.721001))), IndClass.industry), 3.3705), 20.4523)) - Ts_Rank(decay_linear(Ts_Rank(correlation(Ts_Rank(low, 7.87871), Ts_Rank(adv60, 17.255), 4.97547), 18.5925), 15.7152), 6.71659)) * -1) 
Alpha#98: (rank(decay_linear(correlation(vwap, sum(adv5, 26.4719), 4.58418), 7.18088)) - rank(decay_linear(Ts_Rank(Ts_ArgMin(correlation(rank(open), rank(adv15), 20.8187), 8.62571), 6.95668), 8.07206))) 
Alpha#99: ((rank(correlation(sum(((high + low) / 2), 19.8975), sum(adv60, 19.8975), 8.8136)) < rank(correlation(low, volume, 6.28259))) * -1) 
Alpha#100: (0 - (1 * (((1.5 * scale(indneutralize(indneutralize(rank(((((close - low) - (high - close)) / (high - low)) * volume)), IndClass.subindustry), IndClass.subindustry))) - scale(indneutralize((correlation(close, rank(adv20), 5) - rank(ts_argmin(close, 30))), IndClass.subindustry))) * (volume / adv20)))) 
Alpha#101: ((close - open) / ((high - low) + .001)) 
```